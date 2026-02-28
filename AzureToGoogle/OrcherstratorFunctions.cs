using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Threading.Tasks;
using CloudFiles.Models;
using CloudFiles.Models.Google;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.AzureToGoogle
{
    /** Orcherstrator functions must be Deterministic
     * https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-code-constraints
     * - No Dates/Times, Guids, Random numbers
     * - No I/O input/output bindings
     * - No network calls to external systems
     * - No async operations (other than calling tasks)
     * - No to: .ConfigureAwait(false)
     * - No reading environment variables
     * - No infinite loops
     **/

    [SuppressMessage("Readability", "RCS1090", Justification = "Orcherstrators must not have .ConfigureAwait(false)")]
    public static class OrcherstratorFunctions
    {
        [Function(Constants.AzureStorageToGooglePhotosOrchestrator)]
        public static async Task<object> AzureToGoogleOrchestrator(
               [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<FilesCopyRequest>()!;

            log.LogInformation($"{Constants.AzureStorageToGooglePhotosOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<ItemsPrepared>(
                Constants.AzureStorageToGooglePhotosPrepareList, request);

            log.LogInformation($"{Constants.AzureStorageToGooglePhotosOrchestrator}: FanOut request to {Constants.CopyAzureBlobsToGooglePhotosOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<NewMediaItemResultRoot>(
               Constants.CopyAzureBlobsToGooglePhotosOrchestrator, preparedRequest);

            return new {
                request,
                preparedRequest.ListItemsPrepared,
                results.NewMediaItemResults
            };
        }

        [Function(Constants.CopyAzureBlobsToGooglePhotosOrchestrator)]
        public static async Task<NewMediaItemResultRoot> CopyBlobsToGoogleOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var filesCopyItemsPrepared = context.GetInput<ItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<NewMediaItemResultRoot>, string>();
            log.LogInformation("Fan-Out CopyBlobToGoogle");
            foreach (var item in filesCopyItemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<NewMediaItemResultRoot>(Constants.CopyAzureBlobToGooglePhotos, item);
                taskToFile[task] = item.ItemFilename;
            }

            var pending = new HashSet<Task<NewMediaItemResultRoot>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new NewMediaItemResultRoot
            {
                NewMediaItemResults = new List<NewMediaItemResult>()
            };

            log.LogInformation("Fan-In CopyBlobToGoogle");
            while (pending.Count > 0)
            {
                var done = await Task.WhenAny(pending);
                pending.Remove(done);
                var result = await done;
                response.NewMediaItemResults.AddRange(result.NewMediaItemResults);

                context.SetCustomStatus(new
                {
                    completed = total - pending.Count,
                    total,
                    lastFile = taskToFile[done]
                });
            }

            return response;
        }
    }
}

using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using CloudFiles.Models.Google;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.GoogleToGoogle
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
    public static class OrcherstratorFunctions
    {
        [Function(Constants.GooleStorageToGooglePhotosOrchestrator)]
        public static async Task<object> GooleStorageToGooglePhotosOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<FilesCopyRequest>();

            log.LogInformation($"{Constants.GooleStorageToGooglePhotosOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<GoogleItemsPrepared>(
                Constants.GoogleStorageToGooglePhotosPrepareList, request);

            log.LogInformation($"{Constants.GooleStorageToGooglePhotosOrchestrator}: FanOut request to {Constants.CopyGoogleStorageToGooglePhotosOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<NewMediaItemResultRoot>(
               Constants.CopyGoogleStorageToGooglePhotosOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.NewMediaItemResults
            };
        }

        [Function(Constants.CopyGoogleStorageToGooglePhotosOrchestrator)]
        public static async Task<NewMediaItemResultRoot> CopyGoogleStorageToGooglePhotosOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var filesCopyItemsPrepared = context.GetInput<GoogleItemsPrepared>();

            var taskToFile = new Dictionary<Task<NewMediaItemResultRoot>, string>();
            log.LogInformation("Fan-Out CopyPhotoUrlToGoogle");
            foreach (var item in filesCopyItemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<NewMediaItemResultRoot>(Constants.CopyPhotoUrlToGooglePhotos, item);
                taskToFile[task] = item.ItemFilename;
            }

            var pending = new HashSet<Task<NewMediaItemResultRoot>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new NewMediaItemResultRoot
            {
                NewMediaItemResults = new List<NewMediaItemResult>()
            };

            log.LogInformation("Fan-In CopyPhotoUrlToGoogle");
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

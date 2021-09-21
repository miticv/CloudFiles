using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using CloudFiles.Models.Google;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.DurableTask;
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
        [FunctionName(Constants.GooleStorageToGooglePhotosOrchestrator)]
        public static async Task<object> GooleStorageToGooglePhotosOrchestrator(
            [OrchestrationTrigger] IDurableOrchestrationContext context, ILogger log)
        {
            log = context.CreateReplaySafeLogger(log);

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

        [FunctionName(Constants.CopyGoogleStorageToGooglePhotosOrchestrator)]
        public static async Task<NewMediaItemResultRoot> CopyGoogleStorageToGooglePhotosOrchestrator(
            [OrchestrationTrigger] IDurableOrchestrationContext context, ILogger log)
        {
            log = context.CreateReplaySafeLogger(log);
            var filesCopyItemsPrepared = context.GetInput<GoogleItemsPrepared>();

            var tasks = new List<Task<NewMediaItemResultRoot>>();
            log.LogInformation("Fan-Out CopyPhotoUrlToGoogle");
            foreach (var item in filesCopyItemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<NewMediaItemResultRoot>(Constants.CopyPhotoUrlToGooglePhotos, item);
                tasks.Add(task);
            }
            log.LogInformation("Fan-In CopyPhotoUrlToGoogle");
            var result = await Task.WhenAll(tasks);

            var response = new NewMediaItemResultRoot
            {
                NewMediaItemResults = new List<NewMediaItemResult>()
            };
            foreach (var item in result)
            {
                response.NewMediaItemResults.AddRange(item.NewMediaItemResults);
            }
            return response;
        }
    }
}

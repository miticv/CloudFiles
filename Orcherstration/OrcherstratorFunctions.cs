using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Threading.Tasks;
using CloudFiles.Models;
using CloudFiles.Models.Google;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles
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
        [FunctionName(Constants.AzureToGoogleOrchestrator)]
        public static async Task<object> AzureToGoogleOrchestrator(
               [OrchestrationTrigger] IDurableOrchestrationContext context, ILogger log)
        {
            log = context.CreateReplaySafeLogger(log);

            var request = context.GetInput<FilesCopyRequest>();

            log.LogInformation($"{Constants.AzureToGoogleOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<ItemsPrepared>(
                Constants.AzureToGooglePrepareList, request);

            log.LogInformation($"{Constants.AzureToGoogleOrchestrator}: FanOut request to {Constants.CopyBlobsToGoogleOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<NewMediaItemResultRoot>(
               Constants.CopyBlobsToGoogleOrchestrator, preparedRequest);

            //var copyBlobToGoogleTasksResults = await context.CallActivityWithRetryAsync<List<NewMediaItemResultRoot>>
            //    (Constants.CopyBlobsToGoogleOrchestrator, new RetryOptions(System.TimeSpan.FromSeconds(5), 4)
            //    { Handle = ex => ex is TaskCanceledException }, requestExpanded.ExpandedItemsList);

            return new {
                request,
                preparedRequest.ListItemsPrepared,
                results.NewMediaItemResults
            };
        }

        [FunctionName(Constants.CopyBlobsToGoogleOrchestrator)]
        public static async Task<NewMediaItemResultRoot> CopyBlobsToGoogleOrchestrator(
            [OrchestrationTrigger] IDurableOrchestrationContext context, ILogger log)
        {
            log = context.CreateReplaySafeLogger(log);
            var filesCopyItemsPrepared = context.GetInput<ItemsPrepared>();

            var tasks = new List<Task<NewMediaItemResultRoot>>();
            log.LogInformation("Fan-Out CopyBlobToGoogle");
            foreach (var item in filesCopyItemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<NewMediaItemResultRoot>(Constants.CopyBlobToGoogle, item);
                tasks.Add(task);
            }
            log.LogInformation("Fan-In CopyBlobToGoogle");
            var result = await Task.WhenAll(tasks);

            var response = new NewMediaItemResultRoot
            {
                NewMediaItemResults = new List<NewMediaItemResult>()
            };
            foreach (var item in result) {
                response.NewMediaItemResults.AddRange(item.NewMediaItemResults);
            }
            return response;
        }
    }
}

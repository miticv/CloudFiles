using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AdaFile.Models;
using AdaFile.Models.Google;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.DurableTask;
using Microsoft.Extensions.Logging;

namespace AdaFile
{
    public static class OrcherstratorFunctions
    {
        // https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-overview?tabs=csharp
        // https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-diagnostics?tabs=csharp
        // https://github.com/Azure/azure-functions-durable-extension/releases
        // &showHistory=true&showHistoryOutput=true

        [FunctionName(Constants.AzureToGoogleOrchestrator)]
        public static async Task<object> AzureToGoogleOrchestrator(
               [OrchestrationTrigger] IDurableOrchestrationContext context, ILogger log)
        {
            log = context.CreateReplaySafeLogger(log);

            var request = context.GetInput<FilesCopyRequest>();

            log.LogInformation("Collecting full list of files...");
            var listExpanded = await context.CallActivityAsync<List<Item>>(
                Constants.AzureToGooglePrepareList, request.SelectedItemsList).ConfigureAwait(false);

            log.LogInformation("Preparing collected list ...");
            var requestExpanded = await context.CallActivityAsync<FilesCopyRequestExpanded>(
                Constants.AzureToGooglePrepareList, (request, listExpanded));

            log.LogInformation($"Calling {Constants.CopyBlobsToGoogleOrchestrator} ...");
            var copyBlobToGoogleTasksResults = await context.CallSubOrchestratorAsync<List<NewMediaItemResultRoot>>(
               Constants.CopyBlobsToGoogleOrchestrator, requestExpanded.ExpandedItemsList).ConfigureAwait(false);

            //var copyBlobToGoogleTasksResults = await context.CallActivityWithRetryAsync<List<NewMediaItemResultRoot>>
            //    (Constants.CopyBlobsToGoogleOrchestrator, new RetryOptions(System.TimeSpan.FromSeconds(5), 4)
            //    { Handle = ex => ex is TaskCanceledException }, requestExpanded.ExpandedItemsList).ConfigureAwait(false);

            return new {
                request,
                requestFlat = requestExpanded.ExpandedItemsList,
                copyTasksResults = copyBlobToGoogleTasksResults
            };
        }

        [FunctionName(Constants.CopyBlobsToGoogleOrchestrator)]
        public static async Task<List<NewMediaItemResultRoot>> CopyBlobToGoogleOrchestrator(
            [OrchestrationTrigger] IDurableOrchestrationContext context, ILogger log)
        {
            log = context.CreateReplaySafeLogger(log);
            var filesCopyItemsExpanded = context.GetInput<List<ItemExpanded>>();

            var tasks = new List<Task<NewMediaItemResultRoot>>();
            log.LogInformation("Fannig-Out CopyBlobToGoogle");
            foreach (var image in filesCopyItemsExpanded)
            {
                var task = context.CallActivityAsync<NewMediaItemResultRoot>(Constants.CopyBlobToGoogle, image);
                tasks.Add(task);
            }
            log.LogInformation("Fannig-In CopyBlobToGoogle");
            var list = await Task.WhenAll(tasks).ConfigureAwait(false);
            return list.ToList();
        }
    }
}

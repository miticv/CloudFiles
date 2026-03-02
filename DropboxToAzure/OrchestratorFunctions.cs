using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.DropboxToAzure
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.DropboxToAzureOrchestrator)]
        public static async Task<object> DropboxToAzureOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<DropboxToAzureRequest>()!;

            log.LogInformation($"{Constants.DropboxToAzureOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<DropboxToAzureItemsPrepared>(
                Constants.DropboxToAzurePrepareList, request);

            log.LogInformation($"{Constants.DropboxToAzureOrchestrator}: FanOut request to {Constants.CopyDropboxToAzureOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<BlobCopyResultRoot>(
               Constants.CopyDropboxToAzureOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyDropboxToAzureOrchestrator)]
        public static async Task<BlobCopyResultRoot> CopyDropboxToAzureOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<DropboxToAzureItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<BlobCopyResult>, string>();
            log.LogInformation("Fan-Out CopyDropboxFileToAzureBlob");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<BlobCopyResult>(Constants.CopyDropboxFileToAzureBlob, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<BlobCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new BlobCopyResultRoot();

            log.LogInformation("Fan-In CopyDropboxFileToAzureBlob");
            while (pending.Count > 0)
            {
                var done = await Task.WhenAny(pending);
                pending.Remove(done);
                var result = await done;
                response.Results.Add(result);

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

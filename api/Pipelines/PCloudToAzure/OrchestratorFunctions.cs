using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.PCloudToAzure
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.PCloudToAzureOrchestrator)]
        public static async Task<object> PCloudToAzureOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var request = context.GetInput<PCloudToAzureRequest>()!;

            log.LogInformation($"{Constants.PCloudToAzureOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<PCloudToAzureItemsPrepared>(
                Constants.PCloudToAzurePrepareList, request);

            log.LogInformation($"{Constants.PCloudToAzureOrchestrator}: FanOut request to {Constants.CopyPCloudToAzureOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<BlobCopyResultRoot>(
               Constants.CopyPCloudToAzureOrchestrator, preparedRequest);

            return new { request, preparedRequest.ListItemsPrepared, results.Results };
        }

        [Function(Constants.CopyPCloudToAzureOrchestrator)]
        public static async Task<BlobCopyResultRoot> CopyPCloudToAzureOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<PCloudToAzureItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<BlobCopyResult>, string>();
            log.LogInformation("Fan-Out CopyPCloudFileToAzureBlob");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<BlobCopyResult>(Constants.CopyPCloudFileToAzureBlob, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<BlobCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new BlobCopyResultRoot();

            log.LogInformation("Fan-In CopyPCloudFileToAzureBlob");
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

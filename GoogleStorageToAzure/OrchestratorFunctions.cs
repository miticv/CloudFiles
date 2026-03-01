using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.GoogleStorageToAzure
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.GcsToAzureOrchestrator)]
        public static async Task<object> GcsToAzureOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<GcsToAzureRequest>()!;

            log.LogInformation($"{Constants.GcsToAzureOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<GcsToAzureItemsPrepared>(
                Constants.GcsToAzurePrepareList, request);

            log.LogInformation($"{Constants.GcsToAzureOrchestrator}: FanOut request to {Constants.CopyGcsToAzureOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<BlobCopyResultRoot>(
               Constants.CopyGcsToAzureOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyGcsToAzureOrchestrator)]
        public static async Task<BlobCopyResultRoot> CopyGcsToAzureOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<GcsToAzureItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<BlobCopyResult>, string>();
            log.LogInformation("Fan-Out CopyGcsObjectToAzureBlob");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<BlobCopyResult>(Constants.CopyGcsObjectToAzureBlob, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<BlobCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new BlobCopyResultRoot();

            log.LogInformation("Fan-In CopyGcsObjectToAzureBlob");
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

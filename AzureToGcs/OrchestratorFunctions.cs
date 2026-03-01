using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.AzureToGcs
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.AzureToGcsOrchestrator)]
        public static async Task<object> AzureToGcsOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<AzureToGcsRequest>()!;

            log.LogInformation($"{Constants.AzureToGcsOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<AzureToGcsItemsPrepared>(
                Constants.AzureToGcsPrepareList, request);

            log.LogInformation($"{Constants.AzureToGcsOrchestrator}: FanOut request to {Constants.CopyAzureToGcsOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<GcsCopyResultRoot>(
               Constants.CopyAzureToGcsOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyAzureToGcsOrchestrator)]
        public static async Task<GcsCopyResultRoot> CopyAzureToGcsOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<AzureToGcsItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<GcsCopyResult>, string>();
            log.LogInformation("Fan-Out CopyAzureBlobToGcsObject");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<GcsCopyResult>(Constants.CopyAzureBlobToGcsObject, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<GcsCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new GcsCopyResultRoot();

            log.LogInformation("Fan-In CopyAzureBlobToGcsObject");
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

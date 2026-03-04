using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.PCloudToGcs
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.PCloudToGcsOrchestrator)]
        public static async Task<object> PCloudToGcsOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var request = context.GetInput<PCloudToGcsRequest>()!;

            log.LogInformation($"{Constants.PCloudToGcsOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<PCloudToGcsItemsPrepared>(
                Constants.PCloudToGcsPrepareList, request);

            log.LogInformation($"{Constants.PCloudToGcsOrchestrator}: FanOut request to {Constants.CopyPCloudToGcsOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<GcsCopyResultRoot>(
               Constants.CopyPCloudToGcsOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyPCloudToGcsOrchestrator)]
        public static async Task<GcsCopyResultRoot> CopyPCloudToGcsOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<PCloudToGcsItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<GcsCopyResult>, string>();
            log.LogInformation("Fan-Out CopyPCloudFileToGcsObject");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<GcsCopyResult>(Constants.CopyPCloudFileToGcsObject, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<GcsCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new GcsCopyResultRoot();

            log.LogInformation("Fan-In CopyPCloudFileToGcsObject");
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

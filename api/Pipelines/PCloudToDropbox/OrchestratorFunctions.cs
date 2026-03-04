using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.PCloudToDropbox
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.PCloudToDropboxOrchestrator)]
        public static async Task<object> PCloudToDropboxOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<PCloudToDropboxRequest>()!;

            log.LogInformation($"{Constants.PCloudToDropboxOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<PCloudToDropboxItemsPrepared>(
                Constants.PCloudToDropboxPrepareList, request);

            log.LogInformation($"{Constants.PCloudToDropboxOrchestrator}: FanOut request to {Constants.CopyPCloudToDropboxOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<BlobCopyResultRoot>(
               Constants.CopyPCloudToDropboxOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyPCloudToDropboxOrchestrator)]
        public static async Task<BlobCopyResultRoot> CopyPCloudToDropboxOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<PCloudToDropboxItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<BlobCopyResult>, string>();
            log.LogInformation("Fan-Out CopyPCloudFileToDropbox");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<BlobCopyResult>(Constants.CopyPCloudFileToDropbox, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<BlobCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new BlobCopyResultRoot();

            log.LogInformation("Fan-In CopyPCloudFileToDropbox");
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

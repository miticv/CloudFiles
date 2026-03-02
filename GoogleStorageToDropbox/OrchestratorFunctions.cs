using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.GoogleStorageToDropbox
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.GcsToDropboxOrchestrator)]
        public static async Task<object> GcsToDropboxOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<GcsToDropboxRequest>()!;

            log.LogInformation($"{Constants.GcsToDropboxOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<GcsToDropboxItemsPrepared>(
                Constants.GcsToDropboxPrepareList, request);

            log.LogInformation($"{Constants.GcsToDropboxOrchestrator}: FanOut request to {Constants.CopyGcsToDropboxOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<BlobCopyResultRoot>(
               Constants.CopyGcsToDropboxOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyGcsToDropboxOrchestrator)]
        public static async Task<BlobCopyResultRoot> CopyGcsToDropboxOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<GcsToDropboxItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<BlobCopyResult>, string>();
            log.LogInformation("Fan-Out CopyGcsObjectToDropboxFile");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<BlobCopyResult>(Constants.CopyGcsObjectToDropboxFile, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<BlobCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new BlobCopyResultRoot();

            log.LogInformation("Fan-In CopyGcsObjectToDropboxFile");
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

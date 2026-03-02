using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.DropboxToGoogleStorage
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.DropboxToGcsOrchestrator)]
        public static async Task<object> DropboxToGcsOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<DropboxToGcsRequest>()!;

            log.LogInformation($"{Constants.DropboxToGcsOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<DropboxToGcsItemsPrepared>(
                Constants.DropboxToGcsPrepareList, request);

            log.LogInformation($"{Constants.DropboxToGcsOrchestrator}: FanOut request to {Constants.CopyDropboxToGcsOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<GcsCopyResultRoot>(
               Constants.CopyDropboxToGcsOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyDropboxToGcsOrchestrator)]
        public static async Task<GcsCopyResultRoot> CopyDropboxToGcsOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<DropboxToGcsItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<GcsCopyResult>, string>();
            log.LogInformation("Fan-Out CopyDropboxFileToGcsObject");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<GcsCopyResult>(Constants.CopyDropboxFileToGcsObject, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<GcsCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new GcsCopyResultRoot();

            log.LogInformation("Fan-In CopyDropboxFileToGcsObject");
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

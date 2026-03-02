using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.DropboxToGoogleDrive
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.DropboxToDriveOrchestrator)]
        public static async Task<object> DropboxToDriveOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<DropboxToDriveRequest>()!;

            log.LogInformation($"{Constants.DropboxToDriveOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<DropboxToDriveItemsPrepared>(
                Constants.DropboxToDrivePrepareList, request);

            log.LogInformation($"{Constants.DropboxToDriveOrchestrator}: FanOut request to {Constants.CopyDropboxToDriveOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<BlobCopyResultRoot>(
               Constants.CopyDropboxToDriveOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyDropboxToDriveOrchestrator)]
        public static async Task<BlobCopyResultRoot> CopyDropboxToDriveOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<DropboxToDriveItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<BlobCopyResult>, string>();
            log.LogInformation("Fan-Out CopyDropboxFileToDriveFile");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<BlobCopyResult>(Constants.CopyDropboxFileToDriveFile, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<BlobCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new BlobCopyResultRoot();

            log.LogInformation("Fan-In CopyDropboxFileToDriveFile");
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

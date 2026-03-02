using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.GoogleDriveToDropbox
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.GoogleDriveToDropboxOrchestrator)]
        public static async Task<object> GoogleDriveToDropboxOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<GoogleDriveToDropboxRequest>()!;

            log.LogInformation($"{Constants.GoogleDriveToDropboxOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<DriveToDropboxItemsPrepared>(
                Constants.GoogleDriveToDropboxPrepareList, request);

            log.LogInformation($"{Constants.GoogleDriveToDropboxOrchestrator}: FanOut request to {Constants.CopyGoogleDriveToDropboxOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<BlobCopyResultRoot>(
               Constants.CopyGoogleDriveToDropboxOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyGoogleDriveToDropboxOrchestrator)]
        public static async Task<BlobCopyResultRoot> CopyGoogleDriveToDropboxOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<DriveToDropboxItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<BlobCopyResult>, string>();
            log.LogInformation("Fan-Out CopyGoogleDriveFileToDropbox");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<BlobCopyResult>(Constants.CopyGoogleDriveFileToDropbox, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<BlobCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new BlobCopyResultRoot();

            log.LogInformation("Fan-In CopyGoogleDriveFileToDropbox");
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

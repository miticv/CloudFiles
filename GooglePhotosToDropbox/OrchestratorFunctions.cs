using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.GooglePhotosToDropbox
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.GooglePhotosToDropboxOrchestrator)]
        public static async Task<object> GooglePhotosToDropboxOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<GooglePhotosToDropboxRequest>()!;

            log.LogInformation($"{Constants.GooglePhotosToDropboxOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<PhotoToDropboxItemsPrepared>(
                Constants.GooglePhotosToDropboxPrepareList, request);

            log.LogInformation($"{Constants.GooglePhotosToDropboxOrchestrator}: FanOut request to {Constants.CopyGooglePhotosToDropboxOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<BlobCopyResultRoot>(
               Constants.CopyGooglePhotosToDropboxOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyGooglePhotosToDropboxOrchestrator)]
        public static async Task<BlobCopyResultRoot> CopyGooglePhotosToDropboxOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<PhotoToDropboxItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<BlobCopyResult>, string>();
            log.LogInformation("Fan-Out CopyGooglePhotoToDropbox");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<BlobCopyResult>(Constants.CopyGooglePhotoToDropbox, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<BlobCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new BlobCopyResultRoot();

            log.LogInformation("Fan-In CopyGooglePhotoToDropbox");
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

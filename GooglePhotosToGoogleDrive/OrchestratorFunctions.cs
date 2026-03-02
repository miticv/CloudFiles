using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.GooglePhotosToGoogleDrive
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.GooglePhotosToGoogleDriveOrchestrator)]
        public static async Task<object> GooglePhotosToGoogleDriveOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<GooglePhotosToGoogleDriveRequest>()!;

            log.LogInformation($"{Constants.GooglePhotosToGoogleDriveOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<PhotoToDriveItemsPrepared>(
                Constants.GooglePhotosToGoogleDrivePrepareList, request);

            log.LogInformation($"{Constants.GooglePhotosToGoogleDriveOrchestrator}: FanOut request to {Constants.CopyGooglePhotosToGoogleDriveOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<BlobCopyResultRoot>(
               Constants.CopyGooglePhotosToGoogleDriveOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyGooglePhotosToGoogleDriveOrchestrator)]
        public static async Task<BlobCopyResultRoot> CopyGooglePhotosToGoogleDriveOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<PhotoToDriveItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<BlobCopyResult>, string>();
            log.LogInformation("Fan-Out CopyGooglePhotoToDriveFile");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<BlobCopyResult>(Constants.CopyGooglePhotoToDriveFile, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<BlobCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new BlobCopyResultRoot();

            log.LogInformation("Fan-In CopyGooglePhotoToDriveFile");
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

using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.GooglePhotosToAzure
{
    public static class OrcherstratorFunctions
    {
        [Function(Constants.GooglePhotosToAzureOrchestrator)]
        public static async Task<object> GooglePhotosToAzureOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<GooglePhotosToAzureRequest>()!;

            log.LogInformation($"{Constants.GooglePhotosToAzureOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<PhotoToAzureItemsPrepared>(
                Constants.GooglePhotosToAzurePrepareList, request);

            log.LogInformation($"{Constants.GooglePhotosToAzureOrchestrator}: FanOut request to {Constants.CopyGooglePhotosToAzureOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<BlobCopyResultRoot>(
               Constants.CopyGooglePhotosToAzureOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyGooglePhotosToAzureOrchestrator)]
        public static async Task<BlobCopyResultRoot> CopyGooglePhotosToAzureOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<PhotoToAzureItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<BlobCopyResult>, string>();
            log.LogInformation("Fan-Out CopyGooglePhotoToAzureBlob");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<BlobCopyResult>(Constants.CopyGooglePhotoToAzureBlob, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<BlobCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new BlobCopyResultRoot();

            log.LogInformation("Fan-In CopyGooglePhotoToAzureBlob");
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

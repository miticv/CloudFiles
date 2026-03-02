using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.GooglePhotosToGcs
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.GooglePhotosToGcsOrchestrator)]
        public static async Task<object> GooglePhotosToGcsOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<GooglePhotosToGcsRequest>()!;

            log.LogInformation($"{Constants.GooglePhotosToGcsOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<PhotoToGcsItemsPrepared>(
                Constants.GooglePhotosToGcsPrepareList, request);

            log.LogInformation($"{Constants.GooglePhotosToGcsOrchestrator}: FanOut request to {Constants.CopyGooglePhotosToGcsOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<GcsCopyResultRoot>(
               Constants.CopyGooglePhotosToGcsOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyGooglePhotosToGcsOrchestrator)]
        public static async Task<GcsCopyResultRoot> CopyGooglePhotosToGcsOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<PhotoToGcsItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<GcsCopyResult>, string>();
            log.LogInformation("Fan-Out CopyGooglePhotoToGcsObject");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<GcsCopyResult>(Constants.CopyGooglePhotoToGcsObject, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<GcsCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new GcsCopyResultRoot();

            log.LogInformation("Fan-In CopyGooglePhotoToGcsObject");
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

using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.GoogleDriveToGcs
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.GoogleDriveToGcsOrchestrator)]
        public static async Task<object> GoogleDriveToGcsOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<GoogleDriveToGcsRequest>()!;

            log.LogInformation($"{Constants.GoogleDriveToGcsOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<DriveToGcsItemsPrepared>(
                Constants.GoogleDriveToGcsPrepareList, request);

            log.LogInformation($"{Constants.GoogleDriveToGcsOrchestrator}: FanOut request to {Constants.CopyGoogleDriveToGcsOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<GcsCopyResultRoot>(
               Constants.CopyGoogleDriveToGcsOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyGoogleDriveToGcsOrchestrator)]
        public static async Task<GcsCopyResultRoot> CopyGoogleDriveToGcsOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<DriveToGcsItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<GcsCopyResult>, string>();
            log.LogInformation("Fan-Out CopyGoogleDriveFileToGcsObject");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<GcsCopyResult>(Constants.CopyGoogleDriveFileToGcsObject, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<GcsCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new GcsCopyResultRoot();

            log.LogInformation("Fan-In CopyGoogleDriveFileToGcsObject");
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

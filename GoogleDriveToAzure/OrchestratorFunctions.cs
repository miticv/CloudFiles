using System.Collections.Generic;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.GoogleDriveToAzure
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.GoogleDriveToAzureOrchestrator)]
        public static async Task<object> GoogleDriveToAzureOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<GoogleDriveToAzureRequest>()!;

            log.LogInformation($"{Constants.GoogleDriveToAzureOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<DriveToAzureItemsPrepared>(
                Constants.GoogleDriveToAzurePrepareList, request);

            log.LogInformation($"{Constants.GoogleDriveToAzureOrchestrator}: FanOut request to {Constants.CopyGoogleDriveToAzureOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<BlobCopyResultRoot>(
               Constants.CopyGoogleDriveToAzureOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyGoogleDriveToAzureOrchestrator)]
        public static async Task<BlobCopyResultRoot> CopyGoogleDriveToAzureOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<DriveToAzureItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<BlobCopyResult>, string>();
            log.LogInformation("Fan-Out CopyGoogleDriveFileToAzureBlob");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<BlobCopyResult>(Constants.CopyGoogleDriveFileToAzureBlob, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<BlobCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new BlobCopyResultRoot();

            log.LogInformation("Fan-In CopyGoogleDriveFileToAzureBlob");
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

using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.AzureToPCloud
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.AzureToPCloudOrchestrator)]
        public static async Task<object> AzureToPCloudOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<AzureToPCloudRequest>()!;

            log.LogInformation($"{Constants.AzureToPCloudOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<AzureToPCloudItemsPrepared>(
                Constants.AzureToPCloudPrepareList, request);

            // Create pCloud folder tree to preserve hierarchy
            var folderPaths = preparedRequest.ListItemsPrepared
                .Select(i => i.Filename)
                .Where(f => f.Contains('/'))
                .Select(f => f.Substring(0, f.LastIndexOf('/')))
                .Distinct()
                .ToList();

            if (folderPaths.Count > 0)
            {
                log.LogInformation($"{Constants.AzureToPCloudOrchestrator}: Creating {folderPaths.Count} folder path(s) in pCloud...");
                var folderMap = await context.CallActivityAsync<Dictionary<string, long>>(
                    Constants.CreatePCloudFolderTree, new CreatePCloudFolderTreeRequest
                    {
                        PCloudAccessToken = request.PCloudAccessToken,
                        PCloudHostname = request.PCloudHostname,
                        RootFolderId = request.DestinationFolderId,
                        FolderPaths = folderPaths
                    });

                foreach (var item in preparedRequest.ListItemsPrepared)
                {
                    var lastSlash = item.Filename.LastIndexOf('/');
                    if (lastSlash >= 0)
                    {
                        var folderPath = item.Filename.Substring(0, lastSlash);
                        if (folderMap.TryGetValue(folderPath, out var folderId))
                            item.DestinationFolderId = folderId;
                        item.Filename = item.Filename.Substring(lastSlash + 1);
                    }
                }
            }

            log.LogInformation($"{Constants.AzureToPCloudOrchestrator}: FanOut request to {Constants.CopyAzureToPCloudOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<BlobCopyResultRoot>(
               Constants.CopyAzureToPCloudOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyAzureToPCloudOrchestrator)]
        public static async Task<BlobCopyResultRoot> CopyAzureToPCloudOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<AzureToPCloudItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<BlobCopyResult>, string>();
            log.LogInformation("Fan-Out CopyAzureBlobToPCloudFile");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<BlobCopyResult>(Constants.CopyAzureBlobToPCloudFile, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<BlobCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new BlobCopyResultRoot();

            log.LogInformation("Fan-In CopyAzureBlobToPCloudFile");
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

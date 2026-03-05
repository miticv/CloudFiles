using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.GcsToPCloud
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.GcsToPCloudOrchestrator)]
        public static async Task<object> GcsToPCloudOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<GcsToPCloudRequest>()!;

            log.LogInformation($"{Constants.GcsToPCloudOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<GcsToPCloudItemsPrepared>(
                Constants.GcsToPCloudPrepareList, request);

            // Create pCloud folder tree to preserve hierarchy
            var folderPaths = preparedRequest.ListItemsPrepared
                .Select(i => i.Filename)
                .Where(f => f.Contains('/'))
                .Select(f => f.Substring(0, f.LastIndexOf('/')))
                .Distinct()
                .ToList();

            if (folderPaths.Count > 0)
            {
                log.LogInformation($"{Constants.GcsToPCloudOrchestrator}: Creating {folderPaths.Count} folder path(s) in pCloud...");
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

            log.LogInformation($"{Constants.GcsToPCloudOrchestrator}: FanOut request to {Constants.CopyGcsToPCloudOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<BlobCopyResultRoot>(
               Constants.CopyGcsToPCloudOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyGcsToPCloudOrchestrator)]
        public static async Task<BlobCopyResultRoot> CopyGcsToPCloudOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<GcsToPCloudItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<BlobCopyResult>, string>();
            log.LogInformation("Fan-Out CopyGcsObjectToPCloudFile");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<BlobCopyResult>(Constants.CopyGcsObjectToPCloudFile, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<BlobCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new BlobCopyResultRoot();

            log.LogInformation("Fan-In CopyGcsObjectToPCloudFile");
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

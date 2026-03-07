using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.PCloudToGoogleDrive
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.PCloudToDriveOrchestrator)]
        public static async Task<object> PCloudToDriveOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<PCloudToDriveRequest>()!;

            if (!string.IsNullOrWhiteSpace(request.NewFolderName))
            {
                log.LogInformation($"{Constants.PCloudToDriveOrchestrator}: Creating new folder '{request.NewFolderName}'...");
                var newFolderId = await context.CallActivityAsync<string>(
                    Constants.CreateDriveFolderActivity, new CreateDriveFolderRequest
                    {
                        GoogleAccessToken = request.GoogleAccessToken,
                        ParentFolderId = request.DestinationFolderId,
                        FolderName = request.NewFolderName
                    });
                request.DestinationFolderId = newFolderId;
            }

            log.LogInformation($"{Constants.PCloudToDriveOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<PCloudToDriveItemsPrepared>(
                Constants.PCloudToDrivePrepareList, request);

            // Create Google Drive folder tree to preserve hierarchy
            var folderPaths = preparedRequest.ListItemsPrepared
                .Select(i => i.Filename)
                .Where(f => f.Contains('/'))
                .Select(f => f.Substring(0, f.LastIndexOf('/')))
                .Distinct()
                .ToList();

            if (folderPaths.Count > 0)
            {
                log.LogInformation($"{Constants.PCloudToDriveOrchestrator}: Creating {folderPaths.Count} folder path(s) in Google Drive...");
                var folderMap = await context.CallActivityAsync<Dictionary<string, string>>(
                    Constants.CreateDriveFolderTree, new CreateDriveFolderTreeRequest
                    {
                        GoogleAccessToken = request.GoogleAccessToken,
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

            log.LogInformation($"{Constants.PCloudToDriveOrchestrator}: FanOut request to {Constants.CopyPCloudToDriveOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<BlobCopyResultRoot>(
               Constants.CopyPCloudToDriveOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyPCloudToDriveOrchestrator)]
        public static async Task<BlobCopyResultRoot> CopyPCloudToDriveOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<PCloudToDriveItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<BlobCopyResult>, string>();
            log.LogInformation("Fan-Out CopyPCloudFileToDriveFile");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<BlobCopyResult>(Constants.CopyPCloudFileToDriveFile, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<BlobCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new BlobCopyResultRoot();

            log.LogInformation("Fan-In CopyPCloudFileToDriveFile");
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

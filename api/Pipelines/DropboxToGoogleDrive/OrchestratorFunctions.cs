using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.DropboxToGoogleDrive
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.DropboxToDriveOrchestrator)]
        public static async Task<object> DropboxToDriveOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<DropboxToDriveRequest>()!;

            if (!string.IsNullOrWhiteSpace(request.NewFolderName))
            {
                log.LogInformation($"{Constants.DropboxToDriveOrchestrator}: Creating new folder '{request.NewFolderName}'...");
                var newFolderId = await context.CallActivityAsync<string>(
                    Constants.CreateDriveFolderActivity, new CreateDriveFolderRequest
                    {
                        GoogleAccessToken = request.GoogleAccessToken,
                        ParentFolderId = request.DestinationFolderId,
                        FolderName = request.NewFolderName
                    });
                request.DestinationFolderId = newFolderId;
            }

            log.LogInformation($"{Constants.DropboxToDriveOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<DropboxToDriveItemsPrepared>(
                Constants.DropboxToDrivePrepareList, request);

            // Create Google Drive folder tree to preserve hierarchy
            var folderPaths = preparedRequest.ListItemsPrepared
                .Select(i => i.Filename)
                .Where(f => f.Contains('/'))
                .Select(f => f.Substring(0, f.LastIndexOf('/')))
                .Distinct()
                .ToList();

            if (folderPaths.Count > 0)
            {
                log.LogInformation($"{Constants.DropboxToDriveOrchestrator}: Creating {folderPaths.Count} folder path(s) in Google Drive...");
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

            log.LogInformation($"{Constants.DropboxToDriveOrchestrator}: FanOut request to {Constants.CopyDropboxToDriveOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<BlobCopyResultRoot>(
               Constants.CopyDropboxToDriveOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyDropboxToDriveOrchestrator)]
        public static async Task<BlobCopyResultRoot> CopyDropboxToDriveOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<DropboxToDriveItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<BlobCopyResult>, string>();
            log.LogInformation("Fan-Out CopyDropboxFileToDriveFile");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<BlobCopyResult>(Constants.CopyDropboxFileToDriveFile, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<BlobCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new BlobCopyResultRoot();

            log.LogInformation("Fan-In CopyDropboxFileToDriveFile");
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

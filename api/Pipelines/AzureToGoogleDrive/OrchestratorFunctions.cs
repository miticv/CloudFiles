using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudFiles.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.AzureToGoogleDrive
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.AzureToDriveOrchestrator)]
        public static async Task<object> AzureToDriveOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<AzureToDriveRequest>()!;

            if (!string.IsNullOrWhiteSpace(request.NewFolderName))
            {
                log.LogInformation($"{Constants.AzureToDriveOrchestrator}: Creating new folder '{request.NewFolderName}'...");
                var newFolderId = await context.CallActivityAsync<string>(
                    Constants.CreateDriveFolderActivity, new CreateDriveFolderRequest
                    {
                        GoogleAccessToken = request.AccessToken,
                        ParentFolderId = request.DestinationFolderId,
                        FolderName = request.NewFolderName
                    });
                request.DestinationFolderId = newFolderId;
            }

            log.LogInformation($"{Constants.AzureToDriveOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<AzureToDriveItemsPrepared>(
                Constants.AzureToDrivePrepareList, request);

            // Log filenames to verify full paths are preserved
            foreach (var item in preparedRequest.ListItemsPrepared)
            {
                log.LogInformation($"{Constants.AzureToDriveOrchestrator}: [DIAG] PreparedItem Filename='{item.Filename}' DestFolderId='{item.DestinationFolderId}'");
            }

            // Create Google Drive folder tree to preserve hierarchy
            var folderPaths = preparedRequest.ListItemsPrepared
                .Select(i => i.Filename)
                .Where(f => f.Contains('/'))
                .Select(f => f.Substring(0, f.LastIndexOf('/')))
                .Distinct()
                .ToList();

            log.LogInformation($"{Constants.AzureToDriveOrchestrator}: [DIAG] folderPaths.Count={folderPaths.Count}, paths=[{string.Join(", ", folderPaths)}]");

            if (folderPaths.Count > 0)
            {
                log.LogInformation($"{Constants.AzureToDriveOrchestrator}: Creating {folderPaths.Count} folder path(s) in Google Drive...");
                var folderMap = await context.CallActivityAsync<Dictionary<string, string>>(
                    Constants.CreateDriveFolderTree, new CreateDriveFolderTreeRequest
                    {
                        GoogleAccessToken = request.AccessToken,
                        RootFolderId = request.DestinationFolderId,
                        FolderPaths = folderPaths
                    });

                log.LogInformation($"{Constants.AzureToDriveOrchestrator}: [DIAG] folderMap entries={folderMap.Count}: [{string.Join(", ", folderMap.Select(kv => $"{kv.Key}={kv.Value}"))}]");

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

            // Log final state before fan-out
            foreach (var item in preparedRequest.ListItemsPrepared)
            {
                log.LogInformation($"{Constants.AzureToDriveOrchestrator}: [DIAG] FINAL Filename='{item.Filename}' DestFolderId='{item.DestinationFolderId}'");
            }

            log.LogInformation($"{Constants.AzureToDriveOrchestrator}: FanOut request to {Constants.CopyAzureToDriveOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<BlobCopyResultRoot>(
               Constants.CopyAzureToDriveOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.Results
            };
        }

        [Function(Constants.CopyAzureToDriveOrchestrator)]
        public static async Task<BlobCopyResultRoot> CopyAzureToDriveOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<AzureToDriveItemsPrepared>()!;

            var taskToFile = new Dictionary<Task<BlobCopyResult>, string>();
            log.LogInformation("Fan-Out CopyAzureBlobToDriveFile");
            foreach (var item in itemsPrepared.ListItemsPrepared)
            {
                var task = context.CallActivityAsync<BlobCopyResult>(Constants.CopyAzureBlobToDriveFile, item);
                taskToFile[task] = item.Filename;
            }

            var pending = new HashSet<Task<BlobCopyResult>>(taskToFile.Keys);
            int total = pending.Count;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "" });

            var response = new BlobCopyResultRoot();

            log.LogInformation("Fan-In CopyAzureBlobToDriveFile");
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

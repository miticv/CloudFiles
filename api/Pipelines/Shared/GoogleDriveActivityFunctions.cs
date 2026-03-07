using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudFiles.Shared
{
    public static class GoogleDriveActivityFunctions
    {
        [Function(Constants.CreateDriveFolderActivity)]
        public static async Task<string> CreateDriveFolder(
            [ActivityTrigger] CreateDriveFolderRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(GoogleDriveActivityFunctions));
            log.LogInformation($"{Constants.CreateDriveFolderActivity}: Creating folder '{request.FolderName}' in Google Drive...");

            var folderId = await GoogleUtility.CreateDriveFolderAsync(
                request.ParentFolderId, request.FolderName, request.GoogleAccessToken).ConfigureAwait(false);

            log.LogInformation($"{Constants.CreateDriveFolderActivity}: Created folder with ID '{folderId}'.");
            return folderId;
        }

        [Function(Constants.CreateDriveFolderTree)]
        public static async Task<Dictionary<string, string>> CreateDriveFolderTree(
            [ActivityTrigger] CreateDriveFolderTreeRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(GoogleDriveActivityFunctions));
            log.LogInformation($"{Constants.CreateDriveFolderTree}: Creating {request.FolderPaths.Count} folder path(s) in Google Drive...");

            var folderMap = await GoogleUtility.CreateDriveFolderTreeAsync(
                request.RootFolderId, request.FolderPaths, request.GoogleAccessToken).ConfigureAwait(false);

            log.LogInformation($"{Constants.CreateDriveFolderTree}: Created/resolved {folderMap.Count} folder(s).");
            return folderMap;
        }
    }
}

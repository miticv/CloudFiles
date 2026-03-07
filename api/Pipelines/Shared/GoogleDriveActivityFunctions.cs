using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
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
    }
}

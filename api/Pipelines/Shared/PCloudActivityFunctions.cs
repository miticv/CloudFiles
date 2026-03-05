using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CloudFiles.Shared
{
    public static class PCloudActivityFunctions
    {
        [Function(Constants.CreatePCloudFolderTree)]
        public static async Task<Dictionary<string, long>> CreatePCloudFolderTree(
            [ActivityTrigger] CreatePCloudFolderTreeRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(PCloudActivityFunctions));
            log.LogInformation($"{Constants.CreatePCloudFolderTree}: Creating {request.FolderPaths.Count} folder path(s) in pCloud...");

            var pcloud = PCloudUtility.Create(request.PCloudAccessToken, request.PCloudHostname);
            var folderMap = await pcloud.CreateFolderTreeAsync(request.RootFolderId, request.FolderPaths).ConfigureAwait(false);

            log.LogInformation($"{Constants.CreatePCloudFolderTree}: Created/resolved {folderMap.Count} folder(s).");
            return folderMap;
        }
    }
}

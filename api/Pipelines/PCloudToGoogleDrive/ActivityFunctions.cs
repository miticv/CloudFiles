using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.PCloudToGoogleDrive
{
    public static class ActivityFunctions
    {
        [Function(Constants.PCloudToDrivePrepareList)]
        public static Task<PCloudToDriveItemsPrepared> PCloudToDrivePrepareList(
            [ActivityTrigger] PCloudToDriveRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.PCloudToDrivePrepareList}: Preparing {request.Items.Count} items...");

            var preparedList = new List<PCloudToDriveItemPrepared>();
            foreach (var file in request.Items)
            {
                preparedList.Add(new PCloudToDriveItemPrepared
                {
                    PCloudAccessToken = request.PCloudAccessToken,
                    PCloudHostname = request.PCloudHostname,
                    GoogleAccessToken = request.GoogleAccessToken,
                    FileId = file.FileId,
                    Filename = file.Name,
                    DestinationFolderId = request.DestinationFolderId
                });
            }

            return Task.FromResult(new PCloudToDriveItemsPrepared { ListItemsPrepared = preparedList });
        }

        [Function(Constants.CopyPCloudFileToDriveFile)]
        public static async Task<BlobCopyResult> CopyPCloudFileToDriveFile(
            [ActivityTrigger] PCloudToDriveItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyPCloudFileToDriveFile}: Downloading {item.Filename}...");
                var pcloud = PCloudUtility.Create(item.PCloudAccessToken, item.PCloudHostname);
                var (data, contentType, _) = await pcloud.DownloadFileAsync(item.FileId, item.Filename).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyPCloudFileToDriveFile}: Uploading {item.Filename} to Google Drive ({data.Length} bytes)...");
                var (fileId, size) = await GoogleUtility.UploadToDriveAsync(
                    data, item.Filename, contentType, item.DestinationFolderId, item.GoogleAccessToken).ConfigureAwait(false);

                return new BlobCopyResult
                {
                    Filename = item.Filename,
                    BlobPath = item.Filename,
                    ContentLength = size,
                    Success = true
                };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyPCloudFileToDriveFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = "", Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyPCloudFileToDriveFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = "", Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

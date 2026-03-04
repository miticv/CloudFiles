using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.GoogleDriveToPCloud
{
    public static class ActivityFunctions
    {
        [Function(Constants.GoogleDriveToPCloudPrepareList)]
        public static Task<GoogleDriveToPCloudItemsPrepared> GoogleDriveToPCloudPrepareList(
            [ActivityTrigger] GoogleDriveToPCloudRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.GoogleDriveToPCloudPrepareList}: Preparing {request.DriveItems.Count} items...");

            var preparedList = new List<GoogleDriveToPCloudItemPrepared>();
            foreach (var file in request.DriveItems)
            {
                preparedList.Add(new GoogleDriveToPCloudItemPrepared
                {
                    PCloudAccessToken = request.PCloudAccessToken,
                    PCloudHostname = request.PCloudHostname,
                    GoogleAccessToken = request.GoogleAccessToken,
                    DriveFileId = file.Id,
                    Filename = file.Name,
                    MimeType = file.MimeType,
                    DestinationFolderId = request.DestinationFolderId
                });
            }

            return Task.FromResult(new GoogleDriveToPCloudItemsPrepared { ListItemsPrepared = preparedList });
        }

        [Function(Constants.CopyGoogleDriveFileToPCloudFile)]
        public static async Task<BlobCopyResult> CopyGoogleDriveFileToPCloudFile(
            [ActivityTrigger] GoogleDriveToPCloudItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyGoogleDriveFileToPCloudFile}: Downloading {item.Filename} from Google Drive...");
                var (data, contentType) = await GoogleUtility.DownloadDriveFileAsync(
                    item.DriveFileId, item.GoogleAccessToken).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyGoogleDriveFileToPCloudFile}: Uploading {item.Filename} to pCloud ({data.Length} bytes)...");
                var pcloud = PCloudUtility.Create(item.PCloudAccessToken, item.PCloudHostname);
                await pcloud.UploadFileAsync(data, item.DestinationFolderId, item.Filename).ConfigureAwait(false);

                return new BlobCopyResult
                {
                    Filename = item.Filename,
                    BlobPath = item.DriveFileId,
                    ContentLength = data.Length,
                    Success = true
                };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyGoogleDriveFileToPCloudFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DriveFileId, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyGoogleDriveFileToPCloudFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DriveFileId, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

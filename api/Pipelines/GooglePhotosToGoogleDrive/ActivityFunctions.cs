using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.GooglePhotosToGoogleDrive
{
    public static class ActivityFunctions
    {
        [Function(Constants.GooglePhotosToGoogleDrivePrepareList)]
        public static Task<PhotoToDriveItemsPrepared> GooglePhotosToGoogleDrivePrepareList(
            [ActivityTrigger] GooglePhotosToGoogleDriveRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.GooglePhotosToGoogleDrivePrepareList}: Preparing {request.PhotoItems.Count} items...");

            var preparedList = new List<PhotoToDriveItemPrepared>();
            foreach (var photo in request.PhotoItems)
            {
                preparedList.Add(new PhotoToDriveItemPrepared
                {
                    GoogleAccessToken = request.AccessToken,
                    BaseUrl = photo.BaseUrl,
                    MimeType = photo.MimeType,
                    Filename = photo.Filename,
                    DestinationFolderId = request.DestinationFolderId
                });
            }

            return Task.FromResult(new PhotoToDriveItemsPrepared { ListItemsPrepared = preparedList });
        }

        [Function(Constants.CopyGooglePhotoToDriveFile)]
        public static async Task<BlobCopyResult> CopyGooglePhotoToDriveFile(
            [ActivityTrigger] PhotoToDriveItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyGooglePhotoToDriveFile}: Downloading {item.Filename}...");
                var (data, contentType) = await GoogleUtility.DownloadPickerPhotoAsync(
                    item.BaseUrl, item.GoogleAccessToken).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyGooglePhotoToDriveFile}: Uploading {item.Filename} to Google Drive ({data.Length} bytes)...");
                var (fileId, size) = await GoogleUtility.UploadToDriveAsync(
                    data, item.Filename, contentType, item.DestinationFolderId, item.GoogleAccessToken).ConfigureAwait(false);

                return new BlobCopyResult
                {
                    Filename = item.Filename,
                    BlobPath = fileId,
                    ContentLength = size,
                    Success = true
                };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyGooglePhotoToDriveFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = "", Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyGooglePhotoToDriveFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = "", Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

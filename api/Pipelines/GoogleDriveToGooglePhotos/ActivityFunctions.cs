using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.GoogleDriveToGooglePhotos
{
    public static class ActivityFunctions
    {
        [Function(Constants.GoogleDriveToGooglePhotosPrepareList)]
        public static Task<DriveToGooglePhotosItemsPrepared> GoogleDriveToGooglePhotosPrepareList(
            [ActivityTrigger] GoogleDriveToGooglePhotosRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.GoogleDriveToGooglePhotosPrepareList}: Preparing {request.DriveItems.Count} items...");

            var preparedList = new List<DriveToGooglePhotosItemPrepared>();
            foreach (var file in request.DriveItems)
            {
                preparedList.Add(new DriveToGooglePhotosItemPrepared
                {
                    GoogleAccessToken = request.AccessToken,
                    DriveFileId = file.Id,
                    AlbumId = request.AlbumId,
                    Filename = file.Name,
                });
            }

            return Task.FromResult(new DriveToGooglePhotosItemsPrepared { ListItemsPrepared = preparedList });
        }

        /// <summary>
        /// Upload-only: downloads from Google Drive and uploads bytes to Google Photos.
        /// Returns the item with UploadToken set (or StatusMessage on failure).
        /// Does NOT call batchCreate — that is done by the orchestrator in a batch.
        /// </summary>
        [Function(Constants.UploadGoogleDriveFileToGooglePhotos)]
        public static async Task<DriveToGooglePhotosItemPrepared> UploadGoogleDriveFileToGooglePhotos(
            [ActivityTrigger] DriveToGooglePhotosItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.UploadGoogleDriveFileToGooglePhotos}: Downloading {item.Filename}...");
                var (data, contentType) = await GoogleUtility.DownloadDriveFileAsync(
                    item.DriveFileId, item.GoogleAccessToken).ConfigureAwait(false);

                item.ContentType = contentType;

                if (!CommonUtility.IsSupportedGooglePhotosType(contentType))
                {
                    item.StatusMessage = $"{item.Filename}: Unsupported type ({contentType}). File not uploaded to Google Photos.";
                    return item;
                }

                log.LogInformation($"{Constants.UploadGoogleDriveFileToGooglePhotos}: Uploading {item.Filename} to Google Photos ({data.Length} bytes)...");

                using var memoryStream = new MemoryStream(data) { Position = 0 };

                if (string.IsNullOrEmpty(item.UploadToken))
                {
                    item.UploadToken = await GoogleUtility.CopyBytesToGooglePhotosAsync(
                        memoryStream, item.GoogleAccessToken, contentType).ConfigureAwait(false);
                }

                return item;
            }
            catch (InvalidOperationException ex)
            {
                item.StatusMessage = ex.Message;
                return item;
            }
        }
    }
}

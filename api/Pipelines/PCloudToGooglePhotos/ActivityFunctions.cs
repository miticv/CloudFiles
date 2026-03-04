using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.PCloudToGooglePhotos
{
    public static class ActivityFunctions
    {
        [Function(Constants.PCloudToGooglePhotosPrepareList)]
        public static Task<PCloudToGooglePhotosItemsPrepared> PCloudToGooglePhotosPrepareList(
            [ActivityTrigger] PCloudToGooglePhotosRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.PCloudToGooglePhotosPrepareList}: Preparing {request.Items.Count} items...");

            var preparedList = new List<PCloudToGooglePhotosItemPrepared>();
            foreach (var file in request.Items)
            {
                preparedList.Add(new PCloudToGooglePhotosItemPrepared
                {
                    PCloudAccessToken = request.PCloudAccessToken,
                    PCloudHostname = request.PCloudHostname,
                    GoogleAccessToken = request.GoogleAccessToken,
                    AlbumId = request.AlbumId,
                    FileId = file.FileId,
                    Filename = file.Name,
                });
            }

            return Task.FromResult(new PCloudToGooglePhotosItemsPrepared { ListItemsPrepared = preparedList });
        }

        /// <summary>
        /// Upload-only: downloads from pCloud and uploads bytes to Google Photos.
        /// Returns the item with UploadToken set (or StatusMessage on failure).
        /// Does NOT call batchCreate — that is done by the orchestrator in a batch.
        /// </summary>
        [Function(Constants.UploadPCloudFileToGooglePhotos)]
        public static async Task<PCloudToGooglePhotosItemPrepared> UploadPCloudFileToGooglePhotos(
            [ActivityTrigger] PCloudToGooglePhotosItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.UploadPCloudFileToGooglePhotos}: Downloading {item.Filename}...");
                var pcloud = PCloudUtility.Create(item.PCloudAccessToken, item.PCloudHostname);
                var (data, contentType, _) = await pcloud.DownloadFileAsync(item.FileId, item.Filename).ConfigureAwait(false);

                item.ContentType = contentType;

                if (!CommonUtility.IsSupportedGooglePhotosType(contentType))
                {
                    item.StatusMessage = $"FileId {item.FileId} ({item.Filename}): Unsupported type ({contentType}). File not uploaded to Google Photos.";
                    return item;
                }

                log.LogInformation($"{Constants.UploadPCloudFileToGooglePhotos}: Uploading {item.Filename} to Google Photos ({data.Length} bytes)...");

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

using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.DropboxToGooglePhotos
{
    public static class ActivityFunctions
    {
        [Function(Constants.DropboxToGooglePhotosPrepareList)]
        public static Task<DropboxToGooglePhotosItemsPrepared> DropboxToGooglePhotosPrepareList(
            [ActivityTrigger] DropboxToGooglePhotosRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.DropboxToGooglePhotosPrepareList}: Preparing {request.Items.Count} items...");

            var preparedList = new List<DropboxToGooglePhotosItemPrepared>();
            foreach (var file in request.Items)
            {
                preparedList.Add(new DropboxToGooglePhotosItemPrepared
                {
                    DropboxAccessToken = request.DropboxAccessToken,
                    GoogleAccessToken = request.GoogleAccessToken,
                    AlbumId = request.AlbumId,
                    DropboxPath = file.Path,
                    Filename = file.Name,
                });
            }

            return Task.FromResult(new DropboxToGooglePhotosItemsPrepared { ListItemsPrepared = preparedList });
        }

        /// <summary>
        /// Upload-only: downloads from Dropbox and uploads bytes to Google Photos.
        /// Returns the item with UploadToken set (or StatusMessage on failure).
        /// Does NOT call batchCreate — that is done by the orchestrator in a batch.
        /// </summary>
        [Function(Constants.UploadDropboxFileToGooglePhotos)]
        public static async Task<DropboxToGooglePhotosItemPrepared> UploadDropboxFileToGooglePhotos(
            [ActivityTrigger] DropboxToGooglePhotosItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.UploadDropboxFileToGooglePhotos}: Downloading {item.Filename}...");
                var dropbox = DropboxUtility.Create(item.DropboxAccessToken);
                var (data, contentType, _) = await dropbox.DownloadFileAsync(item.DropboxPath).ConfigureAwait(false);

                item.ContentType = contentType;

                if (!CommonUtility.IsSupportedGooglePhotosType(contentType))
                {
                    item.StatusMessage = $"{item.DropboxPath}: Unsupported type ({contentType}). File not uploaded to Google Photos.";
                    return item;
                }

                log.LogInformation($"{Constants.UploadDropboxFileToGooglePhotos}: Uploading {item.Filename} to Google Photos ({data.Length} bytes)...");

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

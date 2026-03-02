using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.GooglePhotosToDropbox
{
    public static class ActivityFunctions
    {
        [Function(Constants.GooglePhotosToDropboxPrepareList)]
        public static Task<PhotoToDropboxItemsPrepared> GooglePhotosToDropboxPrepareList(
            [ActivityTrigger] GooglePhotosToDropboxRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.GooglePhotosToDropboxPrepareList}: Preparing {request.PhotoItems.Count} items...");

            var preparedList = new List<PhotoToDropboxItemPrepared>();
            foreach (var photo in request.PhotoItems)
            {
                var destPath = string.IsNullOrEmpty(request.DestinationFolder)
                    ? $"/{photo.Filename}"
                    : $"/{request.DestinationFolder.TrimStart('/').TrimEnd('/')}/{photo.Filename}";

                preparedList.Add(new PhotoToDropboxItemPrepared
                {
                    GoogleAccessToken = request.AccessToken,
                    BaseUrl = photo.BaseUrl,
                    MimeType = photo.MimeType,
                    Filename = photo.Filename,
                    DropboxAccessToken = request.DropboxAccessToken,
                    DestinationPath = destPath
                });
            }

            return Task.FromResult(new PhotoToDropboxItemsPrepared { ListItemsPrepared = preparedList });
        }

        [Function(Constants.CopyGooglePhotoToDropbox)]
        public static async Task<BlobCopyResult> CopyGooglePhotoToDropbox(
            [ActivityTrigger] PhotoToDropboxItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyGooglePhotoToDropbox}: Downloading {item.Filename}...");
                var (data, contentType) = await GoogleUtility.DownloadPickerPhotoAsync(
                    item.BaseUrl, item.GoogleAccessToken).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyGooglePhotoToDropbox}: Uploading {item.Filename} to Dropbox ({data.Length} bytes)...");
                var dropbox = DropboxUtility.Create(item.DropboxAccessToken);
                await dropbox.UploadFileAsync(data, item.DestinationPath).ConfigureAwait(false);

                return new BlobCopyResult
                {
                    Filename = item.Filename,
                    BlobPath = item.DestinationPath,
                    ContentLength = data.Length,
                    Success = true
                };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyGooglePhotoToDropbox}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyGooglePhotoToDropbox}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

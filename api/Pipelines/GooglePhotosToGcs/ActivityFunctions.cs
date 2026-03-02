using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.GooglePhotosToGcs
{
    public static class ActivityFunctions
    {
        [Function(Constants.GooglePhotosToGcsPrepareList)]
        public static Task<PhotoToGcsItemsPrepared> GooglePhotosToGcsPrepareList(
            [ActivityTrigger] GooglePhotosToGcsRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.GooglePhotosToGcsPrepareList}: Preparing {request.PhotoItems.Count} items...");

            var preparedList = new List<PhotoToGcsItemPrepared>();
            foreach (var photo in request.PhotoItems)
            {
                var destObjectName = string.IsNullOrEmpty(request.DestinationFolder)
                    ? photo.Filename
                    : $"{request.DestinationFolder.TrimEnd('/')}/{photo.Filename}";

                preparedList.Add(new PhotoToGcsItemPrepared
                {
                    GoogleAccessToken = request.AccessToken,
                    BaseUrl = photo.BaseUrl,
                    MimeType = photo.MimeType,
                    Filename = photo.Filename,
                    BucketName = request.BucketName,
                    DestinationObjectName = destObjectName
                });
            }

            return Task.FromResult(new PhotoToGcsItemsPrepared { ListItemsPrepared = preparedList });
        }

        [Function(Constants.CopyGooglePhotoToGcsObject)]
        public static async Task<GcsCopyResult> CopyGooglePhotoToGcsObject(
            [ActivityTrigger] PhotoToGcsItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyGooglePhotoToGcsObject}: Downloading {item.Filename}...");
                var (data, contentType) = await GoogleUtility.DownloadPickerPhotoAsync(
                    item.BaseUrl, item.GoogleAccessToken).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyGooglePhotoToGcsObject}: Uploading {item.Filename} to GCS ({data.Length} bytes)...");
                var (objectName, size) = await GoogleUtility.UploadToGcsAsync(
                    data, item.BucketName, item.DestinationObjectName, contentType, item.GoogleAccessToken).ConfigureAwait(false);

                return new GcsCopyResult
                {
                    Filename = item.Filename,
                    ObjectName = objectName,
                    ContentLength = data.Length,
                    Success = true
                };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyGooglePhotoToGcsObject}: Error copying {item.Filename}: {ex.Message}");
                return new GcsCopyResult { Filename = item.Filename, ObjectName = item.DestinationObjectName, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyGooglePhotoToGcsObject}: Error copying {item.Filename}: {ex.Message}");
                return new GcsCopyResult { Filename = item.Filename, ObjectName = item.DestinationObjectName, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

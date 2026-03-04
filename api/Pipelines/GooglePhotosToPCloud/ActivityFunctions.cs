using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.GooglePhotosToPCloud
{
    public static class ActivityFunctions
    {
        [Function(Constants.GooglePhotosToPCloudPrepareList)]
        public static Task<GooglePhotosToPCloudItemsPrepared> GooglePhotosToPCloudPrepareList(
            [ActivityTrigger] GooglePhotosToPCloudRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.GooglePhotosToPCloudPrepareList}: Preparing {request.PhotoItems.Count} items...");

            var preparedList = new List<GooglePhotosToPCloudItemPrepared>();
            foreach (var photo in request.PhotoItems)
            {
                preparedList.Add(new GooglePhotosToPCloudItemPrepared
                {
                    PCloudAccessToken = request.PCloudAccessToken,
                    PCloudHostname = request.PCloudHostname,
                    GoogleAccessToken = request.GoogleAccessToken,
                    BaseUrl = photo.BaseUrl,
                    Filename = photo.Filename,
                    MediaType = photo.MediaType,
                    DestinationFolderId = request.DestinationFolderId
                });
            }

            return Task.FromResult(new GooglePhotosToPCloudItemsPrepared { ListItemsPrepared = preparedList });
        }

        [Function(Constants.CopyGooglePhotoToPCloudFile)]
        public static async Task<BlobCopyResult> CopyGooglePhotoToPCloudFile(
            [ActivityTrigger] GooglePhotosToPCloudItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyGooglePhotoToPCloudFile}: Downloading {item.Filename}...");
                var (data, contentType) = await GoogleUtility.DownloadPickerPhotoAsync(
                    item.BaseUrl, item.GoogleAccessToken).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyGooglePhotoToPCloudFile}: Uploading {item.Filename} to pCloud ({data.Length} bytes)...");
                var pcloud = PCloudUtility.Create(item.PCloudAccessToken, item.PCloudHostname);
                await pcloud.UploadFileAsync(data, item.DestinationFolderId, item.Filename).ConfigureAwait(false);

                return new BlobCopyResult
                {
                    Filename = item.Filename,
                    BlobPath = item.BaseUrl,
                    ContentLength = data.Length,
                    Success = true
                };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyGooglePhotoToPCloudFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.BaseUrl, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyGooglePhotoToPCloudFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.BaseUrl, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

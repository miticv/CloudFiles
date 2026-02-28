using Azure;
using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.GooglePhotosToAzure
{
    public static class ActivityFunctions
    {
        [Function(Constants.GooglePhotosToAzurePrepareList)]
        public static Task<PhotoToAzureItemsPrepared> GooglePhotosToAzurePrepareList(
            [ActivityTrigger] GooglePhotosToAzureRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.GooglePhotosToAzurePrepareList}: Preparing {request.PhotoItems.Count} items...");

            var preparedList = new List<PhotoToAzureItemPrepared>();
            foreach (var photo in request.PhotoItems)
            {
                var destPath = string.IsNullOrEmpty(request.DestinationFolder)
                    ? photo.Filename
                    : $"{request.DestinationFolder.TrimEnd('/')}/{photo.Filename}";

                preparedList.Add(new PhotoToAzureItemPrepared
                {
                    GoogleAccessToken = request.AccessToken,
                    BaseUrl = photo.BaseUrl,
                    MimeType = photo.MimeType,
                    Filename = photo.Filename,
                    AccountName = request.AccountName,
                    ContainerName = request.ContainerName,
                    AzureAccessToken = request.AzureAccessToken,
                    DestinationPath = destPath
                });
            }

            return Task.FromResult(new PhotoToAzureItemsPrepared { ListItemsPrepared = preparedList });
        }

        [Function(Constants.CopyGooglePhotoToAzureBlob)]
        public static async Task<BlobCopyResult> CopyGooglePhotoToAzureBlob(
            [ActivityTrigger] PhotoToAzureItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyGooglePhotoToAzureBlob}: Downloading {item.Filename}...");
                var (data, contentType) = await GoogleUtility.DownloadPickerPhotoAsync(
                    item.BaseUrl, item.GoogleAccessToken).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyGooglePhotoToAzureBlob}: Uploading {item.Filename} to Azure ({data.Length} bytes)...");
                var azureUtility = new AzureUtility(item.AccountName, item.ContainerName, item.AzureAccessToken);
                await azureUtility.UploadBlobAsync(item.DestinationPath, data, contentType).ConfigureAwait(false);

                return new BlobCopyResult
                {
                    Filename = item.Filename,
                    BlobPath = item.DestinationPath,
                    ContentLength = data.Length,
                    Success = true
                };
            }
            catch (RequestFailedException ex)
            {
                var msg = ex.Status == 403
                    ? $"Access denied (HTTP 403). Ensure your Azure account has the 'Storage Blob Data Contributor' role on the target container. Detail: {ex.Message}"
                    : ex.Message;
                log.LogError($"{Constants.CopyGooglePhotoToAzureBlob}: Azure error copying {item.Filename}: {msg}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = msg };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyGooglePhotoToAzureBlob}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyGooglePhotoToAzureBlob}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

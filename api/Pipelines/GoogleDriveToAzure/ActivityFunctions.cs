using Azure;
using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.GoogleDriveToAzure
{
    public static class ActivityFunctions
    {
        [Function(Constants.GoogleDriveToAzurePrepareList)]
        public static Task<DriveToAzureItemsPrepared> GoogleDriveToAzurePrepareList(
            [ActivityTrigger] GoogleDriveToAzureRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.GoogleDriveToAzurePrepareList}: Preparing {request.DriveItems.Count} items...");

            var preparedList = new List<DriveToAzureItemPrepared>();
            foreach (var file in request.DriveItems)
            {
                var destPath = string.IsNullOrEmpty(request.DestinationFolder)
                    ? file.Name
                    : $"{request.DestinationFolder.TrimEnd('/')}/{file.Name}";

                preparedList.Add(new DriveToAzureItemPrepared
                {
                    GoogleAccessToken = request.AccessToken,
                    DriveFileId = file.Id,
                    MimeType = file.MimeType,
                    Filename = file.Name,
                    AccountName = request.AccountName,
                    ContainerName = request.ContainerName,
                    AzureAccessToken = request.AzureAccessToken,
                    DestinationPath = destPath
                });
            }

            return Task.FromResult(new DriveToAzureItemsPrepared { ListItemsPrepared = preparedList });
        }

        [Function(Constants.CopyGoogleDriveFileToAzureBlob)]
        public static async Task<BlobCopyResult> CopyGoogleDriveFileToAzureBlob(
            [ActivityTrigger] DriveToAzureItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyGoogleDriveFileToAzureBlob}: Downloading {item.Filename}...");
                var (data, contentType) = await GoogleUtility.DownloadDriveFileAsync(
                    item.DriveFileId, item.GoogleAccessToken).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyGoogleDriveFileToAzureBlob}: Uploading {item.Filename} to Azure ({data.Length} bytes)...");
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
                log.LogError($"{Constants.CopyGoogleDriveFileToAzureBlob}: Azure error copying {item.Filename}: {msg}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = msg };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyGoogleDriveFileToAzureBlob}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyGoogleDriveFileToAzureBlob}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

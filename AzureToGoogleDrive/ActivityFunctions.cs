using Azure;
using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.AzureToGoogleDrive
{
    public static class ActivityFunctions
    {
        [Function(Constants.AzureToDrivePrepareList)]
        public static async Task<AzureToDriveItemsPrepared> AzureToDrivePrepareList(
            [ActivityTrigger] AzureToDriveRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            var azureUtility = new AzureUtility(request.AccountName, request.ContainerName, request.AzureAccessToken);

            var selectionItems = request.SelectedItems
                .Select(s => new Item(s.ItemPath, s.IsFolder))
                .ToList();

            log.LogInformation($"{Constants.AzureToDrivePrepareList}: Getting full list from {selectionItems.Count} selections...");
            var expandedItemsList = await azureUtility.SelectionToHierarchicalDeepListingAsync(selectionItems).ConfigureAwait(false);

            log.LogInformation($"{Constants.AzureToDrivePrepareList}: Preparing {expandedItemsList.Count} items...");
            var preparedList = new List<AzureToDriveItemPrepared>();
            foreach (var item in expandedItemsList)
            {
                var filename = item.ItemPath.Split('/').Last();
                preparedList.Add(new AzureToDriveItemPrepared
                {
                    GoogleAccessToken = request.AccessToken,
                    AzureAccessToken = request.AzureAccessToken,
                    AccountName = request.AccountName,
                    ContainerName = request.ContainerName,
                    BlobPath = item.ItemPath,
                    DestinationFolderId = request.DestinationFolderId,
                    Filename = filename
                });
            }

            return new AzureToDriveItemsPrepared { ListItemsPrepared = preparedList };
        }

        [Function(Constants.CopyAzureBlobToDriveFile)]
        public static async Task<BlobCopyResult> CopyAzureBlobToDriveFile(
            [ActivityTrigger] AzureToDriveItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyAzureBlobToDriveFile}: Downloading {item.Filename} from Azure...");
                var azureUtility = new AzureUtility(item.AccountName, item.ContainerName, item.AzureAccessToken);
                var blobData = await azureUtility.GetBlobItemAsync(item.BlobPath).ConfigureAwait(false);

                var memoryStream = new MemoryStream();
                await blobData.Content.CopyToAsync(memoryStream).ConfigureAwait(false);
                var data = memoryStream.ToArray();
                var contentType = blobData.ContentType ?? "application/octet-stream";

                log.LogInformation($"{Constants.CopyAzureBlobToDriveFile}: Uploading {item.Filename} to Google Drive ({data.Length} bytes)...");
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
            catch (RequestFailedException ex)
            {
                var msg = ex.Status == 403
                    ? $"Access denied (HTTP 403). Ensure your Azure account has the 'Storage Blob Data Reader' role. Detail: {ex.Message}"
                    : ex.Message;
                log.LogError($"{Constants.CopyAzureBlobToDriveFile}: Azure error copying {item.Filename}: {msg}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = "", Success = false, ErrorMessage = msg };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyAzureBlobToDriveFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = "", Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyAzureBlobToDriveFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = "", Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

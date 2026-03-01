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

namespace CloudFiles.AzureToGcs
{
    public static class ActivityFunctions
    {
        [Function(Constants.AzureToGcsPrepareList)]
        public static async Task<AzureToGcsItemsPrepared> AzureToGcsPrepareList(
            [ActivityTrigger] AzureToGcsRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            var azureUtility = new AzureUtility(request.AccountName, request.ContainerName, request.AzureAccessToken);

            var selectionItems = request.SelectedItems
                .Select(s => new Item(s.ItemPath, s.IsFolder))
                .ToList();

            log.LogInformation($"{Constants.AzureToGcsPrepareList}: Getting full list from {selectionItems.Count} selections...");
            var expandedItemsList = await azureUtility.SelectionToHierarchicalDeepListingAsync(selectionItems).ConfigureAwait(false);

            log.LogInformation($"{Constants.AzureToGcsPrepareList}: Preparing {expandedItemsList.Count} items...");
            var preparedList = new List<AzureToGcsItemPrepared>();
            foreach (var item in expandedItemsList)
            {
                var filename = item.ItemPath.Split('/').Last();
                var destObjectName = string.IsNullOrEmpty(request.DestinationFolder)
                    ? item.ItemPath
                    : $"{request.DestinationFolder.TrimEnd('/')}/{item.ItemPath}";

                preparedList.Add(new AzureToGcsItemPrepared
                {
                    GoogleAccessToken = request.AccessToken,
                    AzureAccessToken = request.AzureAccessToken,
                    AccountName = request.AccountName,
                    ContainerName = request.ContainerName,
                    BlobPath = item.ItemPath,
                    BucketName = request.BucketName,
                    DestinationObjectName = destObjectName,
                    ContentType = "",
                    Filename = filename
                });
            }

            return new AzureToGcsItemsPrepared { ListItemsPrepared = preparedList };
        }

        [Function(Constants.CopyAzureBlobToGcsObject)]
        public static async Task<GcsCopyResult> CopyAzureBlobToGcsObject(
            [ActivityTrigger] AzureToGcsItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyAzureBlobToGcsObject}: Downloading {item.Filename} from Azure...");
                var azureUtility = new AzureUtility(item.AccountName, item.ContainerName, item.AzureAccessToken);
                var blobData = await azureUtility.GetBlobItemAsync(item.BlobPath).ConfigureAwait(false);

                var memoryStream = new MemoryStream();
                await blobData.Content.CopyToAsync(memoryStream).ConfigureAwait(false);
                var data = memoryStream.ToArray();
                var contentType = blobData.ContentType ?? "application/octet-stream";

                log.LogInformation($"{Constants.CopyAzureBlobToGcsObject}: Uploading {item.Filename} to GCS ({data.Length} bytes)...");
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
            catch (RequestFailedException ex)
            {
                var msg = ex.Status == 403
                    ? $"Access denied (HTTP 403). Ensure your Azure account has the 'Storage Blob Data Reader' role. Detail: {ex.Message}"
                    : ex.Message;
                log.LogError($"{Constants.CopyAzureBlobToGcsObject}: Azure error copying {item.Filename}: {msg}");
                return new GcsCopyResult { Filename = item.Filename, ObjectName = item.DestinationObjectName, Success = false, ErrorMessage = msg };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyAzureBlobToGcsObject}: Error copying {item.Filename}: {ex.Message}");
                return new GcsCopyResult { Filename = item.Filename, ObjectName = item.DestinationObjectName, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyAzureBlobToGcsObject}: Error copying {item.Filename}: {ex.Message}");
                return new GcsCopyResult { Filename = item.Filename, ObjectName = item.DestinationObjectName, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

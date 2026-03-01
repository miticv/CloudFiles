using Azure;
using CloudFiles.Models;
using CloudFiles.Models.Google;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.GoogleStorageToAzure
{
    public static class ActivityFunctions
    {
        [Function(Constants.GcsToAzurePrepareList)]
        public static async Task<GcsToAzureItemsPrepared> GcsToAzurePrepareList(
            [ActivityTrigger] GcsToAzureRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            var googleUtility = GoogleUtility.Create(request.AccessToken, request.BucketName);

            var selectionItems = request.SelectedItems
                .Select(s => new Item(s.ItemPath, s.IsFolder))
                .ToList();

            log.LogInformation($"{Constants.GcsToAzurePrepareList}: Getting full list from {selectionItems.Count} selections...");
            var expandedItemsList = await googleUtility.SelectionToHierarchicalDeepListingAsync(selectionItems).ConfigureAwait(false);

            log.LogInformation($"{Constants.GcsToAzurePrepareList}: Preparing {expandedItemsList.Count} items...");
            var preparedList = new List<GcsToAzureItemPrepared>();
            foreach (var item in expandedItemsList)
            {
                var filename = item.ItemPath.Split('/').Last();
                var destPath = string.IsNullOrEmpty(request.DestinationFolder)
                    ? filename
                    : $"{request.DestinationFolder.TrimEnd('/')}/{filename}";

                preparedList.Add(new GcsToAzureItemPrepared
                {
                    GoogleAccessToken = request.AccessToken,
                    MediaLink = item.MedialLink,
                    ContentType = item.ContentType,
                    Filename = filename,
                    AccountName = request.AccountName,
                    ContainerName = request.ContainerName,
                    AzureAccessToken = request.AzureAccessToken,
                    DestinationPath = destPath
                });
            }

            return new GcsToAzureItemsPrepared { ListItemsPrepared = preparedList };
        }

        [Function(Constants.CopyGcsObjectToAzureBlob)]
        public static async Task<BlobCopyResult> CopyGcsObjectToAzureBlob(
            [ActivityTrigger] GcsToAzureItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyGcsObjectToAzureBlob}: Downloading {item.Filename}...");
                var data = await GoogleUtility.GetImageFromUrlAsync(
                    item.MediaLink, item.GoogleAccessToken).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyGcsObjectToAzureBlob}: Uploading {item.Filename} to Azure ({data.Length} bytes)...");
                var azureUtility = new AzureUtility(item.AccountName, item.ContainerName, item.AzureAccessToken);
                await azureUtility.UploadBlobAsync(item.DestinationPath, data, item.ContentType).ConfigureAwait(false);

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
                log.LogError($"{Constants.CopyGcsObjectToAzureBlob}: Azure error copying {item.Filename}: {msg}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = msg };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyGcsObjectToAzureBlob}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyGcsObjectToAzureBlob}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

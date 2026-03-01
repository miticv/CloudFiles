using CloudFiles.Models;
using CloudFiles.Models.Google;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.AzureToGoogle
{
    public static class ActivityFunctions
    {
        [Function(Constants.AzureStorageToGooglePhotosPrepareList)]
        public static async Task<ItemsPrepared> AzureToGooglePrepareList(
            [ActivityTrigger] FilesCopyRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            var azureUtility = new AzureUtility(request.AccountName, request.ContainerName, request.AzureAccessToken);

            log.LogInformation($"{Constants.AzureStorageToGooglePhotosPrepareList}: Getting full list from {request.SelectedItemsList.Count} selections...");
            var expandedItemsList = await azureUtility.SelectionToHierarchicalDeepListingAsync(request.SelectedItemsList.ToList()).ConfigureAwait(false);

            log.LogInformation($"{Constants.AzureStorageToGooglePhotosPrepareList}: Preparing {expandedItemsList.Count} items...");
            var preparedList = new List<ItemPrepared>();
            foreach (var item in expandedItemsList) {
                preparedList.Add(new ItemPrepared(item, request.AccessToken, request.AlbumId,
                    request.AccountName, request.ContainerName, request.AzureAccessToken));
            }

            return new ItemsPrepared() {  ListItemsPrepared = preparedList };
        }

        /// <summary>
        /// Upload-only: downloads blob from Azure and uploads bytes to Google Photos.
        /// Returns the ItemPrepared with UploadToken set (or StatusMessage on failure).
        /// Does NOT call batchCreate — that is done by the orchestrator in a batch.
        /// </summary>
        [Function(Constants.UploadAzureBlobToGooglePhotos)]
        public static async Task<ItemPrepared> UploadAzureBlobToGooglePhotos(
            [ActivityTrigger] ItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                var failFilter = Environment.GetEnvironmentVariable("FEATURE_FLAG_TEST_FAIL_FILENAME_CONTAINS");
                if (!string.IsNullOrEmpty(failFilter) && item.ItemFilename.Contains(failFilter, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException($"[TEST] Simulated failure for: {item.ItemFilename}");

                log.LogInformation($"{Constants.UploadAzureBlobToGooglePhotos}: Uploading {item.ItemPath}.");

                var azureUtility = new AzureUtility(item.AccountName!, item.ContainerName!, item.AzureAccessToken!);

                var blobData = await azureUtility.GetBlobItemAsync(item.ItemPath).ConfigureAwait(false);
                item.ContentType = blobData.ContentType;
                item.ContentLength = blobData.Details.ContentLength;

                if (!CommonUtility.IsSupportedGooglePhotosType(item.ContentType))
                {
                    item.StatusMessage = $"{item.ItemPath}: Unsupported type ({item.ContentType}). File not uploaded to Google Photos.";
                    return item;
                }

                MemoryStream memoryStream = new MemoryStream();
                await blobData.Content.CopyToAsync(memoryStream).ConfigureAwait(false);
                memoryStream.Position = 0;

                if (String.IsNullOrEmpty(item.UploadToken))
                {
                    item.UploadToken = await GoogleUtility.CopyBytesToGooglePhotosAsync(memoryStream, item.AccessToken, item.ContentType).ConfigureAwait(false);
                }

                return item;
            }
            catch (Exception ex) when (ex is InvalidOperationException || ex is HttpRequestException)
            {
                item.StatusMessage = ex.Message;
                return item;
            }
        }

        /// <summary>
        /// Shared activity: calls Google Photos batchCreate with up to 50 items at once.
        /// </summary>
        [Function(Constants.BatchCreateGoogleMediaItems)]
        public static async Task<NewMediaItemResultRoot> BatchCreateGoogleMediaItems(
            [ActivityTrigger] BatchCreateRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            log.LogInformation($"{Constants.BatchCreateGoogleMediaItems}: Creating {request.Items.Count} media items in batch.");

            return await GoogleUtility.SaveMediaItemsBatchAsync(request.AccessToken, request.AlbumId, request.Items).ConfigureAwait(false);
        }
    }
}

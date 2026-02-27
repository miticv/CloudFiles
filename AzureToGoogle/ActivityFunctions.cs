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

        [Function(Constants.CopyAzureBlobToGooglePhotos)]
        public static async Task<NewMediaItemResultRoot> CopyAzureBlobToGooglePhotos(
            [ActivityTrigger] ItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyAzureBlobToGooglePhotos}: Copy image {item.ItemPath}.");

                var azureUtility = new AzureUtility(item.AccountName, item.ContainerName, item.AzureAccessToken);

                var blobData = await azureUtility.GetBlobItemAsync(item.ItemPath).ConfigureAwait(false);

                MemoryStream memoryStream = new MemoryStream();
                await blobData.Content.CopyToAsync(memoryStream).ConfigureAwait(false);
                memoryStream.Position = 0;
                item.ContentType = blobData.ContentType;
                item.ContentLength = blobData.Details.ContentLength;

                if (String.IsNullOrEmpty(item.UploadToken))
                {
                    item.UploadToken = await GoogleUtility.CopyBytesToGooglePhotosAsync(memoryStream, item.AccessToken, item.ContentType).ConfigureAwait(false);
                }

                return await GoogleUtility.SaveMediaItemsToGooglePhotosAsync(item).ConfigureAwait(false);
            }
            catch (InvalidOperationException ex)
            {
                return ReturnUnprocessedItem(ex.Message, item);
            }
            catch (HttpRequestException ex)
            {
                return ReturnUnprocessedItem(ex.Message, item);
            }
        }

        private static NewMediaItemResultRoot ReturnUnprocessedItem(string message, ItemPrepared item) {
            var quit = new NewMediaItemResultRoot() { NewMediaItemResults = new List<NewMediaItemResult>() };
            quit.NewMediaItemResults.Add(new NewMediaItemResult()
            {
                Status = new Status()
                {
                    Message = message
                },
                MediaItem = new MediaItem()
                {
                    Filename = item.ItemFilename
                },
                UploadToken = item.UploadToken
            });
            return quit;
        }
    }
}

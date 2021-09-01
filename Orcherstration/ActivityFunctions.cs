using CloudFiles.Models;
using CloudFiles.Models.Google;
using CloudFiles.Utilities;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.DurableTask;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles
{
    public static class ActivityFunctions
    {
        [FunctionName(Constants.AzureStorageToGooglePhotosPrepareList)]
        public static async Task<ItemsPrepared> AzureToGooglePrepareList(
            [ActivityTrigger] FilesCopyRequest request,
            ILogger log)
        {
            var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
            var containerName = Environment.GetEnvironmentVariable("AzureContainer");
            var azureUtility = new AzureUtility(connectionString, containerName);

            log.LogInformation($"{Constants.AzureStorageToGooglePhotosPrepareList}: Getting full list from {request.SelectedItemsList.Count} selections...");
            var expandedItemsList = await azureUtility.SelectionToHierarchicalDeepListingAsync(request.SelectedItemsList.ToList()).ConfigureAwait(false);

            log.LogInformation($"{Constants.AzureStorageToGooglePhotosPrepareList}: Preparing {expandedItemsList.Count} items...");
            var preparedList = new List<ItemPrepared>();
            foreach (var item in expandedItemsList) {
                preparedList.Add(new ItemPrepared(item, request.AccessToken, request.AlbumId));
            }

            return new ItemsPrepared() {  ListItemsPrepared = preparedList };
        }

        [FunctionName(Constants.CopyAzureBlobToGooglePhotos)]
        public static async Task<NewMediaItemResultRoot> CopyAzureBlobToGooglePhotos(
            [ActivityTrigger] ItemPrepared item,
             ILogger log)
        {
            try
            {
                log.LogInformation($"{Constants.CopyAzureBlobToGooglePhotos}: Copy image {item.ItemPath}.");

                var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
                var containerName = Environment.GetEnvironmentVariable("AzureContainer");
                var azureUtility = new AzureUtility(connectionString, containerName);

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

        [FunctionName(Constants.GoogleStorageToGooglePhotosPrepareList)]
        public static async Task<GoogleItemsPrepared> GoogleStorageToGooglePhotosPrepareList(
            [ActivityTrigger] FilesCopyRequest request,
            ILogger log)
        {
            var googleUtility = await GoogleUtility.CreateAsync().ConfigureAwait(false);

            log.LogInformation($"{Constants.GoogleStorageToGooglePhotosPrepareList}: Getting full list from {request.SelectedItemsList.Count} selections...");
            var expandedItemsList = await googleUtility.SelectionToHierarchicalDeepListingAsync(request.SelectedItemsList.ToList()).ConfigureAwait(false);

            log.LogInformation($"{Constants.GoogleStorageToGooglePhotosPrepareList}: Preparing {expandedItemsList.Count} items...");
            var preparedList = new List<GoogleItemPrepared>();
            foreach (var item in expandedItemsList)
            {
                preparedList.Add(new GoogleItemPrepared(item, request.AccessToken, request.AlbumId));
            }

            return new GoogleItemsPrepared() { ListItemsPrepared = preparedList };
        }

        [FunctionName(Constants.CopyPhotoUrlToGooglePhotos)]
        public static async Task<NewMediaItemResultRoot> CopyPhotoUrlToGooglePhotos(
            [ActivityTrigger] GoogleItemPrepared item,
             ILogger log)
        {
            try
            {
                log.LogInformation($"{Constants.CopyPhotoUrlToGooglePhotos}: Copy image {item.ItemPath}.");

                var imageByteArray = await GoogleUtility.GetImageFromUrlAsync(item.MediaLInk, item.AccessToken).ConfigureAwait(false);

                MemoryStream memoryStream = new MemoryStream(imageByteArray)
                {
                    Position = 0
                };
                item.ContentLength = imageByteArray.Length;

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

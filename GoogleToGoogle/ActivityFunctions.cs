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

namespace CloudFiles.GoogleToGoogle
{
    public static class ActivityFunctions
    {
        [Function(Constants.GoogleStorageToGooglePhotosPrepareList)]
        public static async Task<GoogleItemsPrepared> GoogleStorageToGooglePhotosPrepareList(
            [ActivityTrigger] FilesCopyRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

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

        [Function(Constants.CopyPhotoUrlToGooglePhotos)]
        public static async Task<NewMediaItemResultRoot> CopyPhotoUrlToGooglePhotos(
            [ActivityTrigger] GoogleItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

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

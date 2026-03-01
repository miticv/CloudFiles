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

            var googleUtility = GoogleUtility.Create(request.AccessToken, request.BucketName);

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

        /// <summary>
        /// Upload-only: downloads from Google Storage and uploads bytes to Google Photos.
        /// Returns the GoogleItemPrepared with UploadToken set (or StatusMessage on failure).
        /// Does NOT call batchCreate — that is done by the orchestrator in a batch.
        /// </summary>
        [Function(Constants.UploadGoogleStorageToGooglePhotos)]
        public static async Task<GoogleItemPrepared> UploadGoogleStorageToGooglePhotos(
            [ActivityTrigger] GoogleItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                var failFilter = Environment.GetEnvironmentVariable("FEATURE_FLAG_TEST_FAIL_FILENAME_CONTAINS");
                if (!string.IsNullOrEmpty(failFilter) && item.ItemFilename.Contains(failFilter, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException($"[TEST] Simulated failure for: {item.ItemFilename}");

                if (!CommonUtility.IsSupportedGooglePhotosType(item.ContentType))
                {
                    item.StatusMessage = $"{item.ItemPath}: Unsupported type ({item.ContentType}). File not uploaded to Google Photos.";
                    return item;
                }

                log.LogInformation($"{Constants.UploadGoogleStorageToGooglePhotos}: Uploading {item.ItemPath}.");

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

                return item;
            }
            catch (InvalidOperationException ex)
            {
                item.StatusMessage = ex.Message;
                return item;
            }
        }
    }
}

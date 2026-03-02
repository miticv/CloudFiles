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

namespace CloudFiles.GoogleStorageToGoogleDrive
{
    public static class ActivityFunctions
    {
        [Function(Constants.GcsToDrivePrepareList)]
        public static async Task<GcsToDriveItemsPrepared> GcsToDrivePrepareList(
            [ActivityTrigger] GcsToDriveRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            var googleUtility = GoogleUtility.Create(request.AccessToken, request.BucketName);

            var selectionItems = request.SelectedItems
                .Select(s => new Item(s.ItemPath, s.IsFolder))
                .ToList();

            log.LogInformation($"{Constants.GcsToDrivePrepareList}: Getting full list from {selectionItems.Count} selections...");
            var expandedItemsList = await googleUtility.SelectionToHierarchicalDeepListingAsync(selectionItems).ConfigureAwait(false);

            log.LogInformation($"{Constants.GcsToDrivePrepareList}: Preparing {expandedItemsList.Count} items...");
            var preparedList = new List<GcsToDriveItemPrepared>();
            foreach (var item in expandedItemsList)
            {
                var filename = item.ItemPath.Split('/').Last();
                preparedList.Add(new GcsToDriveItemPrepared
                {
                    GoogleAccessToken = request.AccessToken,
                    MediaLink = item.MedialLink,
                    ContentType = item.ContentType,
                    Filename = filename,
                    DestinationFolderId = request.DestinationFolderId
                });
            }

            return new GcsToDriveItemsPrepared { ListItemsPrepared = preparedList };
        }

        [Function(Constants.CopyGcsObjectToDriveFile)]
        public static async Task<BlobCopyResult> CopyGcsObjectToDriveFile(
            [ActivityTrigger] GcsToDriveItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyGcsObjectToDriveFile}: Downloading {item.Filename}...");
                var data = await GoogleUtility.GetImageFromUrlAsync(
                    item.MediaLink, item.GoogleAccessToken).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyGcsObjectToDriveFile}: Uploading {item.Filename} to Google Drive ({data.Length} bytes)...");
                var (fileId, size) = await GoogleUtility.UploadToDriveAsync(
                    data, item.Filename, item.ContentType, item.DestinationFolderId, item.GoogleAccessToken).ConfigureAwait(false);

                return new BlobCopyResult
                {
                    Filename = item.Filename,
                    BlobPath = fileId,
                    ContentLength = size,
                    Success = true
                };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyGcsObjectToDriveFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = "", Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyGcsObjectToDriveFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = "", Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

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

namespace CloudFiles.GcsToPCloud
{
    public static class ActivityFunctions
    {
        [Function(Constants.GcsToPCloudPrepareList)]
        public static async Task<GcsToPCloudItemsPrepared> GcsToPCloudPrepareList(
            [ActivityTrigger] GcsToPCloudRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            var googleUtility = GoogleUtility.Create(request.GoogleAccessToken, request.BucketName);

            var selectionItems = request.SelectedItems
                .Select(s => new Item(s.ItemPath, s.IsFolder))
                .ToList();

            log.LogInformation($"{Constants.GcsToPCloudPrepareList}: Getting full list from {selectionItems.Count} selections...");
            var expandedItemsList = await googleUtility.SelectionToHierarchicalDeepListingAsync(selectionItems).ConfigureAwait(false);

            log.LogInformation($"{Constants.GcsToPCloudPrepareList}: Preparing {expandedItemsList.Count} items...");
            var preparedList = new List<GcsToPCloudItemPrepared>();
            foreach (var item in expandedItemsList)
            {
                if (item.ItemPath.EndsWith("/")) continue; // skip folder markers

                preparedList.Add(new GcsToPCloudItemPrepared
                {
                    PCloudAccessToken = request.PCloudAccessToken,
                    PCloudHostname = request.PCloudHostname,
                    GoogleAccessToken = request.GoogleAccessToken,
                    BucketName = request.BucketName,
                    ObjectName = item.ItemPath,
                    DestinationFolderId = request.DestinationFolderId,
                    Filename = item.ItemPath
                });
            }

            return new GcsToPCloudItemsPrepared { ListItemsPrepared = preparedList };
        }

        [Function(Constants.CopyGcsObjectToPCloudFile)]
        public static async Task<BlobCopyResult> CopyGcsObjectToPCloudFile(
            [ActivityTrigger] GcsToPCloudItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyGcsObjectToPCloudFile}: Downloading {item.Filename}...");
                var mediaLink = $"https://storage.googleapis.com/storage/v1/b/{item.BucketName}/o/{Uri.EscapeDataString(item.ObjectName)}?alt=media";
                var data = await GoogleUtility.GetImageFromUrlAsync(
                    mediaLink, item.GoogleAccessToken).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyGcsObjectToPCloudFile}: Uploading {item.Filename} to pCloud ({data.Length} bytes)...");
                var pcloud = PCloudUtility.Create(item.PCloudAccessToken, item.PCloudHostname);
                await pcloud.UploadFileAsync(data, item.DestinationFolderId, item.Filename).ConfigureAwait(false);

                return new BlobCopyResult
                {
                    Filename = item.Filename,
                    BlobPath = item.ObjectName,
                    ContentLength = data.Length,
                    Success = true
                };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyGcsObjectToPCloudFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.ObjectName, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyGcsObjectToPCloudFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.ObjectName, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

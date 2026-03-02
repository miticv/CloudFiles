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

namespace CloudFiles.GoogleStorageToDropbox
{
    public static class ActivityFunctions
    {
        [Function(Constants.GcsToDropboxPrepareList)]
        public static async Task<GcsToDropboxItemsPrepared> GcsToDropboxPrepareList(
            [ActivityTrigger] GcsToDropboxRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            var googleUtility = GoogleUtility.Create(request.AccessToken, request.BucketName);

            var selectionItems = request.SelectedItems
                .Select(s => new Item(s.ItemPath, s.IsFolder))
                .ToList();

            log.LogInformation($"{Constants.GcsToDropboxPrepareList}: Getting full list from {selectionItems.Count} selections...");
            var expandedItemsList = await googleUtility.SelectionToHierarchicalDeepListingAsync(selectionItems).ConfigureAwait(false);

            log.LogInformation($"{Constants.GcsToDropboxPrepareList}: Preparing {expandedItemsList.Count} items...");
            var preparedList = new List<GcsToDropboxItemPrepared>();
            foreach (var item in expandedItemsList)
            {
                if (item.ItemPath.EndsWith("/")) continue; // skip folder markers

                var filename = item.ItemPath.Split('/').Last();
                var destPath = string.IsNullOrEmpty(request.DestinationFolder)
                    ? $"/{item.ItemPath}"
                    : $"/{request.DestinationFolder.TrimEnd('/')}/{item.ItemPath}";

                preparedList.Add(new GcsToDropboxItemPrepared
                {
                    GoogleAccessToken = request.AccessToken,
                    DropboxAccessToken = request.DropboxAccessToken,
                    MediaLink = item.MedialLink,
                    ContentType = item.ContentType,
                    Filename = filename,
                    DestinationPath = destPath
                });
            }

            return new GcsToDropboxItemsPrepared { ListItemsPrepared = preparedList };
        }

        [Function(Constants.CopyGcsObjectToDropboxFile)]
        public static async Task<BlobCopyResult> CopyGcsObjectToDropboxFile(
            [ActivityTrigger] GcsToDropboxItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyGcsObjectToDropboxFile}: Downloading {item.Filename}...");
                var data = await GoogleUtility.GetImageFromUrlAsync(
                    item.MediaLink, item.GoogleAccessToken).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyGcsObjectToDropboxFile}: Uploading {item.Filename} to Dropbox ({data.Length} bytes)...");
                var dropbox = DropboxUtility.Create(item.DropboxAccessToken);
                await dropbox.UploadFileAsync(data, item.DestinationPath).ConfigureAwait(false);

                return new BlobCopyResult
                {
                    Filename = item.Filename,
                    BlobPath = item.DestinationPath,
                    ContentLength = data.Length,
                    Success = true
                };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyGcsObjectToDropboxFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyGcsObjectToDropboxFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

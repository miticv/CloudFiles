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

namespace CloudFiles.AzureToDropbox
{
    public static class ActivityFunctions
    {
        [Function(Constants.AzureToDropboxPrepareList)]
        public static async Task<AzureToDropboxItemsPrepared> AzureToDropboxPrepareList(
            [ActivityTrigger] AzureToDropboxRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            var azureUtility = new AzureUtility(request.AccountName, request.ContainerName, request.AzureAccessToken);

            var selectionItems = request.SelectedItems
                .Select(s => new Item(s.ItemPath, s.IsFolder))
                .ToList();

            log.LogInformation($"{Constants.AzureToDropboxPrepareList}: Getting full list from {selectionItems.Count} selections...");
            var expandedItemsList = await azureUtility.SelectionToHierarchicalDeepListingAsync(selectionItems).ConfigureAwait(false);

            log.LogInformation($"{Constants.AzureToDropboxPrepareList}: Preparing {expandedItemsList.Count} items...");
            var preparedList = new List<AzureToDropboxItemPrepared>();
            foreach (var item in expandedItemsList)
            {
                if (item.ItemPath.EndsWith("/")) continue; // skip folder markers

                var filename = item.ItemPath.Split('/').Last();
                var destPath = string.IsNullOrEmpty(request.DestinationFolder)
                    ? $"/{item.ItemPath}"
                    : $"/{request.DestinationFolder.TrimEnd('/')}/{item.ItemPath}";

                preparedList.Add(new AzureToDropboxItemPrepared
                {
                    DropboxAccessToken = request.DropboxAccessToken,
                    AzureAccessToken = request.AzureAccessToken,
                    AccountName = request.AccountName,
                    ContainerName = request.ContainerName,
                    BlobPath = item.ItemPath,
                    DestinationPath = destPath,
                    Filename = filename
                });
            }

            return new AzureToDropboxItemsPrepared { ListItemsPrepared = preparedList };
        }

        [Function(Constants.CopyAzureBlobToDropboxFile)]
        public static async Task<BlobCopyResult> CopyAzureBlobToDropboxFile(
            [ActivityTrigger] AzureToDropboxItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyAzureBlobToDropboxFile}: Downloading {item.Filename} from Azure...");
                var azureUtility = new AzureUtility(item.AccountName, item.ContainerName, item.AzureAccessToken);
                var blobData = await azureUtility.GetBlobItemAsync(item.BlobPath).ConfigureAwait(false);

                var memoryStream = new MemoryStream();
                await blobData.Content.CopyToAsync(memoryStream).ConfigureAwait(false);
                var data = memoryStream.ToArray();

                log.LogInformation($"{Constants.CopyAzureBlobToDropboxFile}: Uploading {item.Filename} to Dropbox ({data.Length} bytes)...");
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
            catch (RequestFailedException ex)
            {
                var msg = ex.Status == 403
                    ? $"Access denied (HTTP 403). Ensure your Azure account has the 'Storage Blob Data Reader' role. Detail: {ex.Message}"
                    : ex.Message;
                log.LogError($"{Constants.CopyAzureBlobToDropboxFile}: Azure error copying {item.Filename}: {msg}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = msg };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyAzureBlobToDropboxFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyAzureBlobToDropboxFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

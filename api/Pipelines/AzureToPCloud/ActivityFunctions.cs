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

namespace CloudFiles.AzureToPCloud
{
    public static class ActivityFunctions
    {
        [Function(Constants.AzureToPCloudPrepareList)]
        public static async Task<AzureToPCloudItemsPrepared> AzureToPCloudPrepareList(
            [ActivityTrigger] AzureToPCloudRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            var azureUtility = new AzureUtility(request.AccountName, request.ContainerName, request.AzureAccessToken);
            var selectionItems = request.SelectedItems.Select(s => new Item(s.ItemPath, s.IsFolder)).ToList();

            log.LogInformation($"{Constants.AzureToPCloudPrepareList}: Getting full list from {selectionItems.Count} selections...");
            var expandedItemsList = await azureUtility.SelectionToHierarchicalDeepListingAsync(selectionItems).ConfigureAwait(false);

            log.LogInformation($"{Constants.AzureToPCloudPrepareList}: Preparing {expandedItemsList.Count} items...");
            var preparedList = new List<AzureToPCloudItemPrepared>();
            foreach (var item in expandedItemsList)
            {
                if (item.ItemPath.EndsWith("/")) continue;

                preparedList.Add(new AzureToPCloudItemPrepared
                {
                    PCloudAccessToken = request.PCloudAccessToken,
                    PCloudHostname = request.PCloudHostname,
                    AzureAccessToken = request.AzureAccessToken,
                    AccountName = request.AccountName,
                    ContainerName = request.ContainerName,
                    BlobPath = item.ItemPath,
                    DestinationFolderId = request.DestinationFolderId,
                    Filename = item.ItemPath
                });
            }
            return new AzureToPCloudItemsPrepared { ListItemsPrepared = preparedList };
        }

        [Function(Constants.CopyAzureBlobToPCloudFile)]
        public static async Task<BlobCopyResult> CopyAzureBlobToPCloudFile(
            [ActivityTrigger] AzureToPCloudItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            try
            {
                log.LogInformation($"{Constants.CopyAzureBlobToPCloudFile}: Downloading {item.Filename}...");
                var azureUtility = new AzureUtility(item.AccountName, item.ContainerName, item.AzureAccessToken);
                var blobData = await azureUtility.GetBlobItemAsync(item.BlobPath).ConfigureAwait(false);

                using var memoryStream = new MemoryStream();
                await blobData.Content.CopyToAsync(memoryStream).ConfigureAwait(false);
                var data = memoryStream.ToArray();

                log.LogInformation($"{Constants.CopyAzureBlobToPCloudFile}: Uploading {item.Filename} to pCloud ({data.Length} bytes)...");
                var pcloud = PCloudUtility.Create(item.PCloudAccessToken, item.PCloudHostname);
                await pcloud.UploadFileAsync(data, item.DestinationFolderId, item.Filename).ConfigureAwait(false);

                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.BlobPath, ContentLength = data.Length, Success = true };
            }
            catch (Exception ex) when (ex is RequestFailedException or InvalidOperationException or HttpRequestException)
            {
                log.LogError($"{Constants.CopyAzureBlobToPCloudFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.BlobPath, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

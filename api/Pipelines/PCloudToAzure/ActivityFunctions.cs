using Azure;
using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.PCloudToAzure
{
    public static class ActivityFunctions
    {
        [Function(Constants.PCloudToAzurePrepareList)]
        public static Task<PCloudToAzureItemsPrepared> PCloudToAzurePrepareList(
            [ActivityTrigger] PCloudToAzureRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.PCloudToAzurePrepareList}: Preparing {request.Items.Count} items...");

            var preparedList = new List<PCloudToAzureItemPrepared>();
            foreach (var file in request.Items)
            {
                var destPath = string.IsNullOrEmpty(request.DestinationFolder)
                    ? file.Name
                    : $"{request.DestinationFolder.TrimEnd('/')}/{file.Name}";

                preparedList.Add(new PCloudToAzureItemPrepared
                {
                    PCloudAccessToken = request.PCloudAccessToken,
                    PCloudHostname = request.PCloudHostname,
                    FileId = file.FileId,
                    Filename = file.Name,
                    AccountName = request.AccountName,
                    ContainerName = request.ContainerName,
                    AzureAccessToken = request.AzureAccessToken,
                    DestinationPath = destPath
                });
            }
            return Task.FromResult(new PCloudToAzureItemsPrepared { ListItemsPrepared = preparedList });
        }

        [Function(Constants.CopyPCloudFileToAzureBlob)]
        public static async Task<BlobCopyResult> CopyPCloudFileToAzureBlob(
            [ActivityTrigger] PCloudToAzureItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            try
            {
                log.LogInformation($"{Constants.CopyPCloudFileToAzureBlob}: Downloading {item.Filename}...");
                var pcloud = PCloudUtility.Create(item.PCloudAccessToken, item.PCloudHostname);
                var (data, contentType, _) = await pcloud.DownloadFileAsync(item.FileId, item.Filename).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyPCloudFileToAzureBlob}: Uploading {item.Filename} to Azure ({data.Length} bytes)...");
                var azureUtility = new AzureUtility(item.AccountName, item.ContainerName, item.AzureAccessToken);
                await azureUtility.UploadBlobAsync(item.DestinationPath, data, contentType).ConfigureAwait(false);

                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, ContentLength = data.Length, Success = true };
            }
            catch (Exception ex) when (ex is RequestFailedException or InvalidOperationException or HttpRequestException)
            {
                log.LogError($"{Constants.CopyPCloudFileToAzureBlob}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

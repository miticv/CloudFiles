using Azure;
using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.DropboxToAzure
{
    public static class ActivityFunctions
    {
        [Function(Constants.DropboxToAzurePrepareList)]
        public static Task<DropboxToAzureItemsPrepared> DropboxToAzurePrepareList(
            [ActivityTrigger] DropboxToAzureRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.DropboxToAzurePrepareList}: Preparing {request.Items.Count} items...");

            var preparedList = new List<DropboxToAzureItemPrepared>();
            foreach (var file in request.Items)
            {
                var destPath = string.IsNullOrEmpty(request.DestinationFolder)
                    ? file.Name
                    : $"{request.DestinationFolder.TrimEnd('/')}/{file.Name}";

                preparedList.Add(new DropboxToAzureItemPrepared
                {
                    DropboxAccessToken = request.DropboxAccessToken,
                    DropboxPath = file.Path,
                    Filename = file.Name,
                    AccountName = request.AccountName,
                    ContainerName = request.ContainerName,
                    AzureAccessToken = request.AzureAccessToken,
                    DestinationPath = destPath
                });
            }

            return Task.FromResult(new DropboxToAzureItemsPrepared { ListItemsPrepared = preparedList });
        }

        [Function(Constants.CopyDropboxFileToAzureBlob)]
        public static async Task<BlobCopyResult> CopyDropboxFileToAzureBlob(
            [ActivityTrigger] DropboxToAzureItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyDropboxFileToAzureBlob}: Downloading {item.Filename}...");
                var dropbox = DropboxUtility.Create(item.DropboxAccessToken);
                var (data, contentType, _) = await dropbox.DownloadFileAsync(item.DropboxPath).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyDropboxFileToAzureBlob}: Uploading {item.Filename} to Azure ({data.Length} bytes)...");
                var azureUtility = new AzureUtility(item.AccountName, item.ContainerName, item.AzureAccessToken);
                await azureUtility.UploadBlobAsync(item.DestinationPath, data, contentType).ConfigureAwait(false);

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
                    ? $"Access denied (HTTP 403). Ensure your Azure account has the 'Storage Blob Data Contributor' role on the target container. Detail: {ex.Message}"
                    : ex.Message;
                log.LogError($"{Constants.CopyDropboxFileToAzureBlob}: Azure error copying {item.Filename}: {msg}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = msg };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyDropboxFileToAzureBlob}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyDropboxFileToAzureBlob}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

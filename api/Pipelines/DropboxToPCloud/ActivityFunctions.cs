using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.DropboxToPCloud
{
    public static class ActivityFunctions
    {
        [Function(Constants.DropboxToPCloudPrepareList)]
        public static Task<DropboxToPCloudItemsPrepared> DropboxToPCloudPrepareList(
            [ActivityTrigger] DropboxToPCloudRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.DropboxToPCloudPrepareList}: Preparing {request.Items.Count} items...");

            var preparedList = new List<DropboxToPCloudItemPrepared>();
            foreach (var file in request.Items)
            {
                preparedList.Add(new DropboxToPCloudItemPrepared
                {
                    PCloudAccessToken = request.PCloudAccessToken,
                    PCloudHostname = request.PCloudHostname,
                    DropboxAccessToken = request.DropboxAccessToken,
                    DropboxPath = file.Path,
                    Filename = file.Name,
                    DestinationFolderId = request.DestinationFolderId
                });
            }

            return Task.FromResult(new DropboxToPCloudItemsPrepared { ListItemsPrepared = preparedList });
        }

        [Function(Constants.CopyDropboxFileToPCloudFile)]
        public static async Task<BlobCopyResult> CopyDropboxFileToPCloudFile(
            [ActivityTrigger] DropboxToPCloudItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyDropboxFileToPCloudFile}: Downloading {item.Filename}...");
                var dropbox = DropboxUtility.Create(item.DropboxAccessToken);
                var (data, contentType, _) = await dropbox.DownloadFileAsync(item.DropboxPath).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyDropboxFileToPCloudFile}: Uploading {item.Filename} to pCloud ({data.Length} bytes)...");
                var pcloud = PCloudUtility.Create(item.PCloudAccessToken, item.PCloudHostname);
                await pcloud.UploadFileAsync(data, item.DestinationFolderId, item.Filename).ConfigureAwait(false);

                return new BlobCopyResult
                {
                    Filename = item.Filename,
                    BlobPath = item.DropboxPath,
                    ContentLength = data.Length,
                    Success = true
                };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyDropboxFileToPCloudFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DropboxPath, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyDropboxFileToPCloudFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DropboxPath, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

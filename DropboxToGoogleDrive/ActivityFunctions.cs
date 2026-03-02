using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.DropboxToGoogleDrive
{
    public static class ActivityFunctions
    {
        [Function(Constants.DropboxToDrivePrepareList)]
        public static Task<DropboxToDriveItemsPrepared> DropboxToDrivePrepareList(
            [ActivityTrigger] DropboxToDriveRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.DropboxToDrivePrepareList}: Preparing {request.Items.Count} items...");

            var preparedList = new List<DropboxToDriveItemPrepared>();
            foreach (var file in request.Items)
            {
                preparedList.Add(new DropboxToDriveItemPrepared
                {
                    DropboxAccessToken = request.DropboxAccessToken,
                    GoogleAccessToken = request.GoogleAccessToken,
                    DropboxPath = file.Path,
                    Filename = file.Name,
                    DestinationFolderId = request.DestinationFolderId
                });
            }

            return Task.FromResult(new DropboxToDriveItemsPrepared { ListItemsPrepared = preparedList });
        }

        [Function(Constants.CopyDropboxFileToDriveFile)]
        public static async Task<BlobCopyResult> CopyDropboxFileToDriveFile(
            [ActivityTrigger] DropboxToDriveItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyDropboxFileToDriveFile}: Downloading {item.Filename}...");
                var dropbox = DropboxUtility.Create(item.DropboxAccessToken);
                var (data, contentType, _) = await dropbox.DownloadFileAsync(item.DropboxPath).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyDropboxFileToDriveFile}: Uploading {item.Filename} to Google Drive ({data.Length} bytes)...");
                var (fileId, size) = await GoogleUtility.UploadToDriveAsync(
                    data, item.Filename, contentType, item.DestinationFolderId, item.GoogleAccessToken).ConfigureAwait(false);

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
                log.LogError($"{Constants.CopyDropboxFileToDriveFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = "", Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyDropboxFileToDriveFile}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = "", Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

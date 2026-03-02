using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.GoogleDriveToDropbox
{
    public static class ActivityFunctions
    {
        [Function(Constants.GoogleDriveToDropboxPrepareList)]
        public static Task<DriveToDropboxItemsPrepared> GoogleDriveToDropboxPrepareList(
            [ActivityTrigger] GoogleDriveToDropboxRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.GoogleDriveToDropboxPrepareList}: Preparing {request.DriveItems.Count} items...");

            var preparedList = new List<DriveToDropboxItemPrepared>();
            foreach (var file in request.DriveItems)
            {
                var destPath = string.IsNullOrEmpty(request.DestinationFolder)
                    ? $"/{file.Name}"
                    : $"/{request.DestinationFolder.TrimStart('/').TrimEnd('/')}/{file.Name}";

                preparedList.Add(new DriveToDropboxItemPrepared
                {
                    GoogleAccessToken = request.AccessToken,
                    DriveFileId = file.Id,
                    MimeType = file.MimeType,
                    Filename = file.Name,
                    DropboxAccessToken = request.DropboxAccessToken,
                    DestinationPath = destPath
                });
            }

            return Task.FromResult(new DriveToDropboxItemsPrepared { ListItemsPrepared = preparedList });
        }

        [Function(Constants.CopyGoogleDriveFileToDropbox)]
        public static async Task<BlobCopyResult> CopyGoogleDriveFileToDropbox(
            [ActivityTrigger] DriveToDropboxItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyGoogleDriveFileToDropbox}: Downloading {item.Filename} from Google Drive...");
                var (data, contentType) = await GoogleUtility.DownloadDriveFileAsync(
                    item.DriveFileId, item.GoogleAccessToken).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyGoogleDriveFileToDropbox}: Uploading {item.Filename} to Dropbox ({data.Length} bytes)...");
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
                log.LogError($"{Constants.CopyGoogleDriveFileToDropbox}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyGoogleDriveFileToDropbox}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

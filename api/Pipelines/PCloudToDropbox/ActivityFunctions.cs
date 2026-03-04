using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.PCloudToDropbox
{
    public static class ActivityFunctions
    {
        [Function(Constants.PCloudToDropboxPrepareList)]
        public static Task<PCloudToDropboxItemsPrepared> PCloudToDropboxPrepareList(
            [ActivityTrigger] PCloudToDropboxRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.PCloudToDropboxPrepareList}: Preparing {request.Items.Count} items...");

            var preparedList = new List<PCloudToDropboxItemPrepared>();
            foreach (var file in request.Items)
            {
                var destPath = string.IsNullOrEmpty(request.DestinationFolder)
                    ? $"/{file.Name}"
                    : $"/{request.DestinationFolder.TrimEnd('/')}/{file.Name}";

                preparedList.Add(new PCloudToDropboxItemPrepared
                {
                    PCloudAccessToken = request.PCloudAccessToken,
                    PCloudHostname = request.PCloudHostname,
                    DropboxAccessToken = request.DropboxAccessToken,
                    FileId = file.FileId,
                    Filename = file.Name,
                    DestinationPath = destPath
                });
            }

            return Task.FromResult(new PCloudToDropboxItemsPrepared { ListItemsPrepared = preparedList });
        }

        [Function(Constants.CopyPCloudFileToDropbox)]
        public static async Task<BlobCopyResult> CopyPCloudFileToDropbox(
            [ActivityTrigger] PCloudToDropboxItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyPCloudFileToDropbox}: Downloading {item.Filename}...");
                var pcloud = PCloudUtility.Create(item.PCloudAccessToken, item.PCloudHostname);
                var (data, contentType, _) = await pcloud.DownloadFileAsync(item.FileId, item.Filename).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyPCloudFileToDropbox}: Uploading {item.Filename} to Dropbox ({data.Length} bytes)...");
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
                log.LogError($"{Constants.CopyPCloudFileToDropbox}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyPCloudFileToDropbox}: Error copying {item.Filename}: {ex.Message}");
                return new BlobCopyResult { Filename = item.Filename, BlobPath = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

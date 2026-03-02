using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.DropboxToGoogleStorage
{
    public static class ActivityFunctions
    {
        [Function(Constants.DropboxToGcsPrepareList)]
        public static Task<DropboxToGcsItemsPrepared> DropboxToGcsPrepareList(
            [ActivityTrigger] DropboxToGcsRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.DropboxToGcsPrepareList}: Preparing {request.Items.Count} items...");

            var preparedList = new List<DropboxToGcsItemPrepared>();
            foreach (var file in request.Items)
            {
                var destObjectName = string.IsNullOrEmpty(request.DestinationFolder)
                    ? file.Name
                    : $"{request.DestinationFolder.TrimEnd('/')}/{file.Name}";

                preparedList.Add(new DropboxToGcsItemPrepared
                {
                    DropboxAccessToken = request.DropboxAccessToken,
                    GoogleAccessToken = request.GoogleAccessToken,
                    DropboxPath = file.Path,
                    Filename = file.Name,
                    BucketName = request.BucketName,
                    DestinationObjectName = destObjectName
                });
            }

            return Task.FromResult(new DropboxToGcsItemsPrepared { ListItemsPrepared = preparedList });
        }

        [Function(Constants.CopyDropboxFileToGcsObject)]
        public static async Task<GcsCopyResult> CopyDropboxFileToGcsObject(
            [ActivityTrigger] DropboxToGcsItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyDropboxFileToGcsObject}: Downloading {item.Filename}...");
                var dropbox = DropboxUtility.Create(item.DropboxAccessToken);
                var (data, contentType, _) = await dropbox.DownloadFileAsync(item.DropboxPath).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyDropboxFileToGcsObject}: Uploading {item.Filename} to GCS ({data.Length} bytes)...");
                var (objectName, size) = await GoogleUtility.UploadToGcsAsync(
                    data, item.BucketName, item.DestinationObjectName, contentType, item.GoogleAccessToken).ConfigureAwait(false);

                return new GcsCopyResult
                {
                    Filename = item.Filename,
                    ObjectName = objectName,
                    ContentLength = size,
                    Success = true
                };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyDropboxFileToGcsObject}: Error copying {item.Filename}: {ex.Message}");
                return new GcsCopyResult { Filename = item.Filename, ObjectName = item.DestinationObjectName, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyDropboxFileToGcsObject}: Error copying {item.Filename}: {ex.Message}");
                return new GcsCopyResult { Filename = item.Filename, ObjectName = item.DestinationObjectName, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

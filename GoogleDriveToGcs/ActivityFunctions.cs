using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.GoogleDriveToGcs
{
    public static class ActivityFunctions
    {
        [Function(Constants.GoogleDriveToGcsPrepareList)]
        public static Task<DriveToGcsItemsPrepared> GoogleDriveToGcsPrepareList(
            [ActivityTrigger] GoogleDriveToGcsRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.GoogleDriveToGcsPrepareList}: Preparing {request.DriveItems.Count} items...");

            var preparedList = new List<DriveToGcsItemPrepared>();
            foreach (var file in request.DriveItems)
            {
                var destObjectName = string.IsNullOrEmpty(request.DestinationFolder)
                    ? file.Name
                    : $"{request.DestinationFolder.TrimEnd('/')}/{file.Name}";

                preparedList.Add(new DriveToGcsItemPrepared
                {
                    GoogleAccessToken = request.AccessToken,
                    DriveFileId = file.Id,
                    MimeType = file.MimeType,
                    Filename = file.Name,
                    BucketName = request.BucketName,
                    DestinationObjectName = destObjectName
                });
            }

            return Task.FromResult(new DriveToGcsItemsPrepared { ListItemsPrepared = preparedList });
        }

        [Function(Constants.CopyGoogleDriveFileToGcsObject)]
        public static async Task<GcsCopyResult> CopyGoogleDriveFileToGcsObject(
            [ActivityTrigger] DriveToGcsItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyGoogleDriveFileToGcsObject}: Downloading {item.Filename}...");
                var (data, contentType) = await GoogleUtility.DownloadDriveFileAsync(
                    item.DriveFileId, item.GoogleAccessToken).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyGoogleDriveFileToGcsObject}: Uploading {item.Filename} to GCS ({data.Length} bytes)...");
                var (objectName, size) = await GoogleUtility.UploadToGcsAsync(
                    data, item.BucketName, item.DestinationObjectName, contentType, item.GoogleAccessToken).ConfigureAwait(false);

                return new GcsCopyResult
                {
                    Filename = item.Filename,
                    ObjectName = objectName,
                    ContentLength = data.Length,
                    Success = true
                };
            }
            catch (InvalidOperationException ex)
            {
                log.LogError($"{Constants.CopyGoogleDriveFileToGcsObject}: Error copying {item.Filename}: {ex.Message}");
                return new GcsCopyResult { Filename = item.Filename, ObjectName = item.DestinationObjectName, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyGoogleDriveFileToGcsObject}: Error copying {item.Filename}: {ex.Message}");
                return new GcsCopyResult { Filename = item.Filename, ObjectName = item.DestinationObjectName, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

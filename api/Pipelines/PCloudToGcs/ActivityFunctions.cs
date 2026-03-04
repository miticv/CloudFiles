using CloudFiles.Models;
using CloudFiles.Utilities;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles.PCloudToGcs
{
    public static class ActivityFunctions
    {
        [Function(Constants.PCloudToGcsPrepareList)]
        public static Task<PCloudToGcsItemsPrepared> PCloudToGcsPrepareList(
            [ActivityTrigger] PCloudToGcsRequest request,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));
            log.LogInformation($"{Constants.PCloudToGcsPrepareList}: Preparing {request.Items.Count} items...");

            var preparedList = new List<PCloudToGcsItemPrepared>();
            foreach (var file in request.Items)
            {
                var destObjectName = string.IsNullOrEmpty(request.DestinationFolder)
                    ? file.Name
                    : $"{request.DestinationFolder.TrimEnd('/')}/{file.Name}";

                preparedList.Add(new PCloudToGcsItemPrepared
                {
                    PCloudAccessToken = request.PCloudAccessToken,
                    PCloudHostname = request.PCloudHostname,
                    FileId = file.FileId,
                    Filename = file.Name,
                    GoogleAccessToken = request.GoogleAccessToken,
                    BucketName = request.BucketName,
                    DestinationPath = destObjectName
                });
            }

            return Task.FromResult(new PCloudToGcsItemsPrepared { ListItemsPrepared = preparedList });
        }

        [Function(Constants.CopyPCloudFileToGcsObject)]
        public static async Task<GcsCopyResult> CopyPCloudFileToGcsObject(
            [ActivityTrigger] PCloudToGcsItemPrepared item,
            FunctionContext executionContext)
        {
            ILogger log = executionContext.GetLogger(nameof(ActivityFunctions));

            try
            {
                log.LogInformation($"{Constants.CopyPCloudFileToGcsObject}: Downloading {item.Filename}...");
                var pcloud = PCloudUtility.Create(item.PCloudAccessToken, item.PCloudHostname);
                var (data, contentType, _) = await pcloud.DownloadFileAsync(item.FileId, item.Filename).ConfigureAwait(false);

                log.LogInformation($"{Constants.CopyPCloudFileToGcsObject}: Uploading {item.Filename} to GCS ({data.Length} bytes)...");
                var (objectName, size) = await GoogleUtility.UploadToGcsAsync(
                    data, item.BucketName, item.DestinationPath, contentType, item.GoogleAccessToken).ConfigureAwait(false);

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
                log.LogError($"{Constants.CopyPCloudFileToGcsObject}: Error copying {item.Filename}: {ex.Message}");
                return new GcsCopyResult { Filename = item.Filename, ObjectName = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
            catch (HttpRequestException ex)
            {
                log.LogError($"{Constants.CopyPCloudFileToGcsObject}: Error copying {item.Filename}: {ex.Message}");
                return new GcsCopyResult { Filename = item.Filename, ObjectName = item.DestinationPath, Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}

using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudFiles.Models;
using CloudFiles.Models.Google;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.GoogleDriveToGooglePhotos
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.GoogleDriveToGooglePhotosOrchestrator)]
        public static async Task<object> GoogleDriveToGooglePhotosOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<GoogleDriveToGooglePhotosRequest>()!;

            log.LogInformation($"{Constants.GoogleDriveToGooglePhotosOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<DriveToGooglePhotosItemsPrepared>(
                Constants.GoogleDriveToGooglePhotosPrepareList, request);

            log.LogInformation($"{Constants.GoogleDriveToGooglePhotosOrchestrator}: FanOut request to {Constants.CopyGoogleDriveToGooglePhotosOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<NewMediaItemResultRoot>(
               Constants.CopyGoogleDriveToGooglePhotosOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.NewMediaItemResults
            };
        }

        [Function(Constants.CopyGoogleDriveToGooglePhotosOrchestrator)]
        public static async Task<NewMediaItemResultRoot> CopyGoogleDriveToGooglePhotosOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<DriveToGooglePhotosItemsPrepared>()!;
            var items = itemsPrepared.ListItemsPrepared;
            int total = items.Count;

            const int batchSize = 50;
            var retryOptions = TaskOptions.FromRetryPolicy(new RetryPolicy(
                maxNumberOfAttempts: 3,
                firstRetryInterval: System.TimeSpan.FromSeconds(5),
                backoffCoefficient: 2.0));

            var response = new NewMediaItemResultRoot
            {
                NewMediaItemResults = new List<NewMediaItemResult>()
            };
            int completedCount = 0;
            context.SetCustomStatus(new { completed = 0, total, lastFile = "", phase = "uploading" });

            for (int i = 0; i < total; i += batchSize)
            {
                var chunk = items.GetRange(i, System.Math.Min(batchSize, total - i));
                int batchNum = i / batchSize + 1;

                // --- Upload chunk in parallel with retry ---
                log.LogInformation($"Uploading batch {batchNum}: {chunk.Count} files");
                var uploadTasks = chunk.Select(item =>
                    SafeUploadDrive(context, item, retryOptions)).ToList();
                var results = await Task.WhenAll(uploadTasks);

                var uploaded = results.Where(r => string.IsNullOrEmpty(r.StatusMessage)).ToList();
                foreach (var failed in results.Where(r => !string.IsNullOrEmpty(r.StatusMessage)))
                {
                    response.NewMediaItemResults.Add(new NewMediaItemResult
                    {
                        Status = new Status { Message = failed.StatusMessage },
                        MediaItem = new MediaItem { Filename = failed.Filename },
                        UploadToken = failed.UploadToken
                    });
                }

                completedCount += chunk.Count;
                context.SetCustomStatus(new
                {
                    completed = completedCount, total,
                    lastFile = chunk[^1].Filename, phase = "uploading"
                });

                // --- batchCreate for this chunk's successful uploads ---
                if (uploaded.Count > 0)
                {
                    var first = uploaded[0];
                    var batchRequest = new BatchCreateRequest
                    {
                        AccessToken = first.GoogleAccessToken,
                        AlbumId = first.AlbumId,
                        Items = uploaded.Select(item => new BatchCreateItem
                        {
                            UploadToken = item.UploadToken,
                            FileName = item.Filename
                        }).ToList()
                    };

                    context.SetCustomStatus(new
                    {
                        completed = completedCount, total,
                        lastFile = $"creating batch {batchNum}", phase = "creating"
                    });

                    log.LogInformation($"BatchCreate batch {batchNum}: {uploaded.Count} items");
                    var batchResult = await context.CallActivityAsync<NewMediaItemResultRoot>(
                        Constants.BatchCreateGoogleMediaItems, batchRequest);

                    var tokenToFilename = batchRequest.Items.ToDictionary(x => x.UploadToken, x => x.FileName);
                    foreach (var r in batchResult.NewMediaItemResults)
                    {
                        if ((r.MediaItem == null || string.IsNullOrEmpty(r.MediaItem.Filename))
                            && !string.IsNullOrEmpty(r.UploadToken)
                            && tokenToFilename.TryGetValue(r.UploadToken, out var fn))
                        {
                            r.MediaItem ??= new MediaItem();
                            r.MediaItem.Filename = fn;
                        }
                    }

                    response.NewMediaItemResults.AddRange(batchResult.NewMediaItemResults);
                }
            }

            return response;
        }

        private static async Task<DriveToGooglePhotosItemPrepared> SafeUploadDrive(
            TaskOrchestrationContext context, DriveToGooglePhotosItemPrepared item, TaskOptions options)
        {
            try
            {
                return await context.CallActivityAsync<DriveToGooglePhotosItemPrepared>(
                    Constants.UploadGoogleDriveFileToGooglePhotos, item, options);
            }
            catch (TaskFailedException)
            {
                item.StatusMessage = $"{item.Filename}: Upload failed after retries.";
                return item;
            }
        }
    }
}

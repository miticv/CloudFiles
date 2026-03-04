using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudFiles.Models;
using CloudFiles.Models.Google;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.PCloudToGooglePhotos
{
    public static class OrchestratorFunctions
    {
        [Function(Constants.PCloudToGooglePhotosOrchestrator)]
        public static async Task<object> PCloudToGooglePhotosOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<PCloudToGooglePhotosRequest>()!;

            log.LogInformation($"{Constants.PCloudToGooglePhotosOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<PCloudToGooglePhotosItemsPrepared>(
                Constants.PCloudToGooglePhotosPrepareList, request);

            log.LogInformation($"{Constants.PCloudToGooglePhotosOrchestrator}: FanOut request to {Constants.CopyPCloudToGooglePhotosOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<NewMediaItemResultRoot>(
               Constants.CopyPCloudToGooglePhotosOrchestrator, preparedRequest);

            return new
            {
                request,
                preparedRequest.ListItemsPrepared,
                results.NewMediaItemResults
            };
        }

        [Function(Constants.CopyPCloudToGooglePhotosOrchestrator)]
        public static async Task<NewMediaItemResultRoot> CopyPCloudToGooglePhotosOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var itemsPrepared = context.GetInput<PCloudToGooglePhotosItemsPrepared>()!;
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
                    SafeUploadPCloud(context, item, retryOptions)).ToList();
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

        private static async Task<PCloudToGooglePhotosItemPrepared> SafeUploadPCloud(
            TaskOrchestrationContext context, PCloudToGooglePhotosItemPrepared item, TaskOptions options)
        {
            try
            {
                return await context.CallActivityAsync<PCloudToGooglePhotosItemPrepared>(
                    Constants.UploadPCloudFileToGooglePhotos, item, options);
            }
            catch (TaskFailedException)
            {
                item.StatusMessage = $"FileId {item.FileId} ({item.Filename}): Upload failed after retries.";
                return item;
            }
        }
    }
}

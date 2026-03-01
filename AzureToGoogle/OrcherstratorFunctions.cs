using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Threading.Tasks;
using CloudFiles.Models;
using CloudFiles.Models.Google;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;
using Microsoft.Extensions.Logging;

namespace CloudFiles.AzureToGoogle
{
    /** Orcherstrator functions must be Deterministic
     * https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-code-constraints
     * - No Dates/Times, Guids, Random numbers
     * - No I/O input/output bindings
     * - No network calls to external systems
     * - No async operations (other than calling tasks)
     * - No to: .ConfigureAwait(false)
     * - No reading environment variables
     * - No infinite loops
     **/

    [SuppressMessage("Readability", "RCS1090", Justification = "Orcherstrators must not have .ConfigureAwait(false)")]
    public static class OrcherstratorFunctions
    {
        [Function(Constants.AzureStorageToGooglePhotosOrchestrator)]
        public static async Task<object> AzureToGoogleOrchestrator(
               [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();

            var request = context.GetInput<FilesCopyRequest>()!;

            log.LogInformation($"{Constants.AzureStorageToGooglePhotosOrchestrator}: Preparing request...");
            var preparedRequest = await context.CallActivityAsync<ItemsPrepared>(
                Constants.AzureStorageToGooglePhotosPrepareList, request);

            log.LogInformation($"{Constants.AzureStorageToGooglePhotosOrchestrator}: FanOut request to {Constants.CopyAzureBlobsToGooglePhotosOrchestrator} ...");
            var results = await context.CallSubOrchestratorAsync<NewMediaItemResultRoot>(
               Constants.CopyAzureBlobsToGooglePhotosOrchestrator, preparedRequest);

            return new {
                request,
                preparedRequest.ListItemsPrepared,
                results.NewMediaItemResults
            };
        }

        [Function(Constants.CopyAzureBlobsToGooglePhotosOrchestrator)]
        public static async Task<NewMediaItemResultRoot> CopyBlobsToGoogleOrchestrator(
            [OrchestrationTrigger] TaskOrchestrationContext context)
        {
            ILogger log = context.CreateReplaySafeLogger<object>();
            var filesCopyItemsPrepared = context.GetInput<ItemsPrepared>()!;
            var items = filesCopyItemsPrepared.ListItemsPrepared;
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
                    SafeUploadAzure(context, item, retryOptions)).ToList();
                var results = await Task.WhenAll(uploadTasks);

                var uploaded = results.Where(r => string.IsNullOrEmpty(r.StatusMessage)).ToList();
                foreach (var failed in results.Where(r => !string.IsNullOrEmpty(r.StatusMessage)))
                {
                    response.NewMediaItemResults.Add(new NewMediaItemResult
                    {
                        Status = new Status { Message = failed.StatusMessage },
                        MediaItem = new MediaItem { Filename = failed.ItemFilename },
                        UploadToken = failed.UploadToken
                    });
                }

                completedCount += chunk.Count;
                context.SetCustomStatus(new
                {
                    completed = completedCount, total,
                    lastFile = chunk[^1].ItemFilename, phase = "uploading"
                });

                // --- batchCreate for this chunk's successful uploads ---
                if (uploaded.Count > 0)
                {
                    var first = uploaded[0];
                    var batchRequest = new BatchCreateRequest
                    {
                        AccessToken = first.AccessToken,
                        AlbumId = first.AlbumId,
                        Items = uploaded.Select(item => new BatchCreateItem
                        {
                            UploadToken = item.UploadToken,
                            FileName = item.ItemFilename
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
                    response.NewMediaItemResults.AddRange(batchResult.NewMediaItemResults);
                }
            }

            return response;
        }

        private static async Task<ItemPrepared> SafeUploadAzure(
            TaskOrchestrationContext context, ItemPrepared item, TaskOptions options)
        {
            try
            {
                return await context.CallActivityAsync<ItemPrepared>(
                    Constants.UploadAzureBlobToGooglePhotos, item, options);
            }
            catch (TaskFailedException)
            {
                item.StatusMessage = $"{item.ItemPath}: Upload failed after retries.";
                return item;
            }
        }
    }
}

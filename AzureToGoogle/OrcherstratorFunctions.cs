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
            int total = filesCopyItemsPrepared.ListItemsPrepared.Count;

            // --- Phase 1: Upload bytes sequentially (Google Photos rate-limits uploads per minute) ---
            log.LogInformation("Sequential UploadAzureBlobToGoogle");
            context.SetCustomStatus(new { completed = 0, total, lastFile = "", phase = "uploading" });

            var uploaded = new List<ItemPrepared>();
            var failedResults = new List<NewMediaItemResult>();
            int completedCount = 0;

            foreach (var item in filesCopyItemsPrepared.ListItemsPrepared)
            {
                var result = await context.CallActivityAsync<ItemPrepared>(Constants.UploadAzureBlobToGooglePhotos, item);

                if (!string.IsNullOrEmpty(result.StatusMessage))
                {
                    failedResults.Add(new NewMediaItemResult
                    {
                        Status = new Status { Message = result.StatusMessage },
                        MediaItem = new MediaItem { Filename = result.ItemFilename },
                        UploadToken = result.UploadToken
                    });
                }
                else
                {
                    uploaded.Add(result);
                }

                completedCount++;
                context.SetCustomStatus(new
                {
                    completed = completedCount,
                    total,
                    lastFile = item.ItemFilename,
                    phase = "uploading"
                });
            }

            // --- Phase 2: Batch create media items (sequential, up to 50 per call) ---
            log.LogInformation($"BatchCreate: {uploaded.Count} uploaded, {failedResults.Count} failed during upload");

            var response = new NewMediaItemResultRoot
            {
                NewMediaItemResults = new List<NewMediaItemResult>(failedResults)
            };

            if (uploaded.Count > 0)
            {
                var first = uploaded[0];
                const int batchSize = 50;
                for (int i = 0; i < uploaded.Count; i += batchSize)
                {
                    var batch = uploaded.GetRange(i, System.Math.Min(batchSize, uploaded.Count - i));
                    var batchRequest = new BatchCreateRequest
                    {
                        AccessToken = first.AccessToken,
                        AlbumId = first.AlbumId,
                        Items = batch.Select(item => new BatchCreateItem
                        {
                            UploadToken = item.UploadToken,
                            FileName = item.ItemFilename
                        }).ToList()
                    };

                    context.SetCustomStatus(new
                    {
                        completed = completedCount,
                        total,
                        lastFile = $"batch {i / batchSize + 1}",
                        phase = "creating"
                    });

                    var batchResult = await context.CallActivityAsync<NewMediaItemResultRoot>(
                        Constants.BatchCreateGoogleMediaItems, batchRequest);
                    response.NewMediaItemResults.AddRange(batchResult.NewMediaItemResults);
                }
            }

            return response;
        }
    }
}

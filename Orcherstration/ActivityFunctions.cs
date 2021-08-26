using CloudFiles.Models;
using CloudFiles.Models.Google;
using CloudFiles.Utilities;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.DurableTask;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace CloudFiles
{
    public static class ActivityFunctions
    {
        [FunctionName(Constants.AzureToGooglePrepareList)]
        public static async Task<ItemsPrepared> AzureToGooglePrepareList(
            [ActivityTrigger] FilesCopyRequest request,
            ILogger log)
        {
            var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
            var containerName = Environment.GetEnvironmentVariable("AzureContainer");
            var azureUtility = new AzureUtility(connectionString, containerName);

            log.LogInformation($"{Constants.AzureToGooglePrepareList}: Getting full list from {request.SelectedItemsList.Count} selections...");
            var expandedItemsList = await azureUtility.SelectionToHierarchicalDeepListingAsync(request.SelectedItemsList.ToList()).ConfigureAwait(false);

            log.LogInformation($"{Constants.AzureToGooglePrepareList}: Preparing {expandedItemsList.Count} items...");
            var preparedList = new List<ItemPrepared>();
            foreach (var item in expandedItemsList) {
                preparedList.Add(new ItemPrepared(item, request.AccessToken, request.AlbumId));
            }

            return new ItemsPrepared() {  ListItemsPrepared = preparedList };
        }

        [FunctionName(Constants.CopyBlobToGoogle)]
        public static async Task<NewMediaItemResultRoot> CopyBlobToGoogle(
            [ActivityTrigger] ItemPrepared item,
             ILogger log)
        {
            try
            {
                log.LogInformation($"{Constants.CopyBlobToGoogle}: Copy image {item.ItemPath}.");

                var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
                var containerName = Environment.GetEnvironmentVariable("AzureContainer");
                var azureUtility = new AzureUtility(connectionString, containerName);

                var blobData = await azureUtility.GetBlobItemAsync(item.ItemPath).ConfigureAwait(false);

                MemoryStream memoryStream = new MemoryStream();
                await blobData.Content.CopyToAsync(memoryStream).ConfigureAwait(false);
                memoryStream.Position = 0;

                item.UploadToken = await GoogleUtility.CopyBytesToGooglePhotosAsync(memoryStream, item.AccessToken, blobData.ContentType).ConfigureAwait(false);

                return await GoogleUtility.SaveMediaItemsToGooglePhotosAsync(item).ConfigureAwait(false);
            }
            catch(InvalidOperationException ex) {
                return ReturnUnprocessedItem(ex.Message, item.ItemPath);
            }
            catch (HttpRequestException ex)
            {
                return ReturnUnprocessedItem(ex.Message, item.ItemPath);
            }
        }

        private static NewMediaItemResultRoot ReturnUnprocessedItem(string message, string fileName) {
            var quit = new NewMediaItemResultRoot() { NewMediaItemResults = new List<NewMediaItemResult>() };
            quit.NewMediaItemResults.Add(new NewMediaItemResult()
            {
                Status = new Status()
                {
                    Message = message
                },
                MediaItem = new MediaItem()
                {
                    Filename = fileName
                }
            });
            return quit;
        }
    }
}

using AdaFile.Models;
using AdaFile.Models.Google;
using AdaFile.Utilities;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.DurableTask;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace AdaFile
{
    public static class ActivityFunctions
    {
        [FunctionName(Constants.AzureToGoogleCollectList)]
        public static async Task<List<Item>> AzureToGoogleCollectList(
            [ActivityTrigger] List<Item> request,
            ILogger log)
        {
            var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
            var containerName = Environment.GetEnvironmentVariable("AzureContainer");
            var azureUtility = new AzureUtility(connectionString, containerName);

            log.LogInformation("Getting full list of images...");
            return await azureUtility.SelectionToHierarchicalDeepListingAsync(request).ConfigureAwait(false);
        }

        [FunctionName(Constants.AzureToGooglePrepareList)]
        public static FilesCopyRequestExpanded AzureToGooglePrepareList(
            [ActivityTrigger] IDurableActivityContext inputs,
            ILogger log)
        {
            var (request, listExpanded) = inputs.GetInput<(FilesCopyRequest, List<Item>)>();
            return new FilesCopyRequestExpanded(request, listExpanded);
        }

        [FunctionName(Constants.CopyBlobToGoogle)]
        public static async Task<NewMediaItemResultRoot> CopyBlobToGoogle(
            [ActivityTrigger] ItemExpanded imageItem,
             ILogger log)
        {
            log.LogInformation($"Copy image {imageItem.ItemPath}.");

            var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
            var containerName = Environment.GetEnvironmentVariable("AzureContainer");
            var azureUtility = new AzureUtility(connectionString, containerName);

            var blobData = await azureUtility.GetBlobItemAsync(imageItem.ItemPath).ConfigureAwait(false);

            MemoryStream memoryStream = new MemoryStream();
            await blobData.Content.CopyToAsync(memoryStream).ConfigureAwait(false);
            memoryStream.Position = 0;

            imageItem.UploadToken = await GoogleUtility.CopyBytesToGooglePhotosAsync(memoryStream, imageItem.AccessToken, blobData.ContentType).ConfigureAwait(false);

            return await GoogleUtility.SaveMediaItemsToGooglePhotosAsync(imageItem).ConfigureAwait(false);
            //await Task.Delay(5000).ConfigureAwait(false);
            //return new NewMediaItemResultRoot() { NewMediaItemResults = new List<NewMediaItemResult>() { new NewMediaItemResult() { UploadToken="**", Status = new Status() { Message = "success" },  MediaItem = new MediaItem() { Id="*" } } } };
        }
    }
}

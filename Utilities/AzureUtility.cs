using CloudFiles.Models;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace CloudFiles.Utilities
{
    public class AzureUtility
    {
        private string ConnectionString { get; }
        private string ContainerName { get; }
        private BlobContainerClient ContainerClient { get; }

        public AzureUtility(string connectionString, string containerName) {
            ConnectionString = connectionString;
            ContainerName = containerName;
            ContainerClient = GetBlobContainerClient();
        }
        private BlobContainerClient GetBlobContainerClient()
        {
            BlobServiceClient blobServiceClient = new BlobServiceClient(ConnectionString);
            return blobServiceClient.GetBlobContainerClient(ContainerName);
        }

        /**
         * Get all files within the prefix folder
         */
        public async Task<List<Item>> ItemsHierarchicalDeepListingAsync(string folderPath, int? pageSize)
        {
            var result = new List<Item>();
            // Call the listing operation and return pages of the specified size.
            var resultSegment = ContainerClient.GetBlobsByHierarchyAsync(prefix: folderPath, delimiter: "/")
                .AsPages(default, pageSize);

            // Enumerate the blobs returned for each page.
            await foreach (Azure.Page<BlobHierarchyItem> blobPage in resultSegment)
            {
                // A hierarchical listing may return both virtual directories and blobs.
                foreach (BlobHierarchyItem blobhierarchyItem in blobPage.Values)
                {
                    if (blobhierarchyItem.IsPrefix)  // this is directory
                    {
                        result.AddRange(await ItemsHierarchicalDeepListingAsync(blobhierarchyItem.Prefix, null).ConfigureAwait(false));
                    }
                    else
                    {
                        result.Add(new Item(blobhierarchyItem.Blob.Name));
                    }
                }
            }
            return result;
        }

        public async Task<List<Item>> ItemShallowListingAsync(string prefix, int? segmentSize)
        {
            var result = new List<Item>();
            // Call the listing operation and return pages of the specified size.
            var resultSegment = ContainerClient.GetBlobsByHierarchyAsync(prefix: prefix, delimiter: "/")
                .AsPages(default, segmentSize);

            // Enumerate the blobs returned for each page.
            await foreach (Azure.Page<BlobHierarchyItem> blobPage in resultSegment)
            {
                // A hierarchical listing may return both virtual directories and blobs.
                foreach (BlobHierarchyItem blobhierarchyItem in blobPage.Values)
                {
                    if (blobhierarchyItem.IsPrefix)  // this is directory
                    {
                        result.Add(new Item(blobhierarchyItem.Prefix, true));
                    }
                    else
                    {
                        result.Add(new Item(blobhierarchyItem.Blob.Name));
                    }
                }
            }
            return result;
        }

        public async Task<List<Item>> SelectionToHierarchicalDeepListingAsync(List<Item> itemList) {
            var result = new List<Item>();
            foreach (Item item in itemList) {
                if (item.IsFolder) {
                    result.AddRange(await ItemsHierarchicalDeepListingAsync(item.ItemPath, null).ConfigureAwait(false));
                } else {
                    result.Add(item);
                }
            }
            return result;
        }

        public async Task<BlobDownloadInfo> GetBlobItemAsync(string filePath)
        {
            BlobClient blobClient = ContainerClient.GetBlobClient(filePath);
            return await blobClient.DownloadAsync().ConfigureAwait(false);
        }

        // filePath = "2011 PhotoShoot Feng/Feng-1.jpg"
        public async Task<IActionResult> GetHttpItemAsync(string filePath)
        {
            var blobdata = await GetBlobItemAsync(filePath).ConfigureAwait(false);
            MemoryStream memoryStream = new MemoryStream();
            await blobdata.Content.CopyToAsync(memoryStream).ConfigureAwait(false);
            memoryStream.Position = 0;

            return new FileStreamResult(memoryStream, blobdata.ContentType);
        }
    }
}

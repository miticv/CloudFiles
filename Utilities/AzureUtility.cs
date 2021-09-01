using CloudFiles.Models;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using System.Net.Http;
using Microsoft.Rest;
using Microsoft.Azure.Management.ResourceManager;
using System.Linq;
using CloudFiles.Models.Azure;
using System;
using Newtonsoft.Json;

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

        // GET https://management.azure.com/subscriptions?api-version=2018-02-01 but using sdk instead
        public static async Task<List<AzureSubscription>> ListSubscriptionsAsync(string access_token)
        {
            var credentials = new TokenCredentials(access_token);

            using SubscriptionClient client = new SubscriptionClient(credentials);
            var subscriptions = await client.Subscriptions.ListAsync().ConfigureAwait(false);
            return subscriptions.OrderBy(x => x.DisplayName)
                .Select(sub => new AzureSubscription() {
                    Id = sub.Id,
                    SubscriptionId = sub.SubscriptionId,
                    DisplayName =sub.DisplayName,
                    TenantId =sub.TenantId,
                    State = sub.State
                })
                .ToList();
        }

        public static async Task<List<AzureResource>> ListResourceGroupsAsync(string access_token, string subscriptionId)
        {
            var result = new List<AzureResource>();
            using HttpClient client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", access_token);
            var urlGet = $"https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups?api-version=2021-04-01";

            HttpResponseMessage response = await client.GetAsync(urlGet).ConfigureAwait(false);
            var data = response.Content.ReadAsStringAsync().Result;

            if (response.IsSuccessStatusCode)
            {
                var rawResult = JsonConvert.DeserializeObject<RawAzureResourceGroups>(data);
                foreach (var item in rawResult.Value)
                {
                    result.Add(new AzureResource()
                    {
                        Id = item.Id,
                        Name = item.Name,
                        Location = item.Location
                    });
                }
                return result;
            }
            else
            {
                throw new InvalidOperationException(data);
            }
        }

        public static async Task<List<AzureStorageAccount>> ListStorageAccountsAsync(string access_token, string subscriptionId, string resourceGroup)
        {
            var result = new List<AzureStorageAccount>();
            using HttpClient client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", access_token);
            var urlGet = $"https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroup}/providers/Microsoft.Storage/storageAccounts?api-version=2021-06-01";

            HttpResponseMessage response = await client.GetAsync(urlGet).ConfigureAwait(false);
            var data = response.Content.ReadAsStringAsync().Result;

            if (response.IsSuccessStatusCode)
            {
                var rawResult = JsonConvert.DeserializeObject<RawAzureBlobContainers>(data);
                foreach (var item in rawResult.Value) {
                    result.Add(new AzureStorageAccount()
                    {
                        Id = item.Id,
                        Name = item.Name,
                        AccessTier = item.Properties.AccessTier,
                        Location = item.Location,
                        Type = item.Type,
                        CreationTime = item.Properties.CreationTime,
                        PrimaryEndpoints = item.Properties.PrimaryEndpoints,
                        SecondaryEndpoints = item.Properties.SecondaryEndpoints
                    });
                }
                return result;
            }
            else
            {
                throw new InvalidOperationException(data);
            }
        }

        public static async Task<List<AzureContainer>> ListBlobContainersAsync(string access_token, string subscriptionId, string resourceGroupName, string accountName)
        {
            var result = new List<AzureContainer>();
            using HttpClient client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", access_token);
            var urlGet = $"https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Storage/storageAccounts/{accountName}/blobServices/default/containers?api-version=2021-04-01"; // &$maxpagesize={$maxpagesize}&$filter={$filter}&$include=deleted

            HttpResponseMessage response = await client.GetAsync(urlGet).ConfigureAwait(false);
            var data = response.Content.ReadAsStringAsync().Result;

            if (response.IsSuccessStatusCode)
            {
                var rawResult = JsonConvert.DeserializeObject<RawAzureContainer>(data);
                foreach (var item in rawResult.Value)
                {
                    result.Add(new AzureContainer()
                    {
                        Id = item.Id,
                        Name = item.Name,
                        LastModifiedTime = item.Properties.LastModifiedTime
                    });
                }
                return result;
            }
            else
            {
                throw new InvalidOperationException(data);
            }
        }

        /********************************************************************************************************************************************/

        /**
         * Get all files within the prefix folder
         */
        public async Task<List<Item>> ItemsHierarchicalDeepListingAsync(string folderPath, int? pageSize)
        {
            // const tokenCredential = new Azure.TokenCredential(accessToken)
            //BlobServiceClient blobServiceClient = new(ConnectionString);
            //var ContainerClient = blobServiceClient.GetBlobContainerClient(ContainerName);

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

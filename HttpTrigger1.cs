using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Azure.Storage.Blobs;
using System.Collections.Generic;
using Azure.Storage.Blobs.Models;

namespace Ada.Photo
{
    public static class HttpTrigger1
    {
        [FunctionName("HttpTrigger1")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            var connectionString = Environment.GetEnvironmentVariable("AzureStorage");
            BlobServiceClient blobServiceClient = new BlobServiceClient(connectionString);
            BlobContainerClient containerClient = blobServiceClient.GetBlobContainerClient("images");
            log.LogInformation("C# HTTP trigger function processed a request.");

            string prefix = req.Query["prefix"];

            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            dynamic data = JsonConvert.DeserializeObject(requestBody);
            prefix = prefix ?? data?.prefix;

            var responseMessage = await HttpTrigger1.ListBlobsHierarchicalListing(containerClient, prefix, null);

            return new OkObjectResult(responseMessage);
        }

        private static async Task<List<string>> ListBlobsHierarchicalListing(BlobContainerClient container,
                                                     string? prefix,
                                                     int? segmentSize
                                                    )
        {
            var result = new List<string>();
            // Call the listing operation and return pages of the specified size.
            var resultSegment = container.GetBlobsByHierarchyAsync(prefix: prefix, delimiter: "/")
                .AsPages(default, segmentSize);

            // Enumerate the blobs returned for each page.
            await foreach (Azure.Page<BlobHierarchyItem> blobPage in resultSegment)
            {
                // A hierarchical listing may return both virtual directories and blobs.
                foreach (BlobHierarchyItem blobhierarchyItem in blobPage.Values)
                {
                    if (blobhierarchyItem.IsPrefix)
                    {
                        // Write out the prefix of the virtual directory.
                        result.Add($"Virtual directory prefix: {blobhierarchyItem.Prefix}");

                        // Call recursively with the prefix to traverse the virtual directory.
                        result.AddRange(await ListBlobsHierarchicalListing(container, blobhierarchyItem.Prefix, null));
                    }
                    else
                    {
                        // Write out the name of the blob.
                        result.Add($"Blob name: {blobhierarchyItem.Blob.Name}");
                    }
                }
            }
            return result;
        }
    }
}

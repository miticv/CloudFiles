using CloudFiles.Models;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using System.Net.Http;
using System.Linq;
using CloudFiles.Models.Azure;
using System;
using Newtonsoft.Json;
using Microsoft.IdentityModel.JsonWebTokens;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Protocols;
using Microsoft.AspNetCore.Http;
using Azure.Core;
using Azure.ResourceManager;
using Azure.ResourceManager.Resources;

namespace CloudFiles.Utilities
{
    public class AzureUtility
    {
        private string ConnectionString { get; } = default!;
        private string ContainerName { get; }
        private BlobContainerClient ContainerClient { get; }

        public AzureUtility(string connectionString, string containerName) {
            ConnectionString = connectionString;
            ContainerName = containerName;
            ContainerClient = GetBlobContainerClient();
        }

        public AzureUtility(string accountName, string containerName, string accessToken) {
            ContainerName = containerName;
            var blobServiceUri = new Uri($"https://{accountName}.blob.core.windows.net");
            var credential = new StaticAccessTokenCredential(accessToken);
            var blobServiceClient = new BlobServiceClient(blobServiceUri, credential);
            ContainerClient = blobServiceClient.GetBlobContainerClient(containerName);
        }

        private BlobContainerClient GetBlobContainerClient()
        {
            BlobServiceClient blobServiceClient = new BlobServiceClient(ConnectionString);
            return blobServiceClient.GetBlobContainerClient(ContainerName);
        }

        // VerifyGoogleHeaderTokenIsValid
        public static async Task<string> VerifyAzureManagementHeaderTokenIsValid(HttpRequest req)
        {
            string accessToken = CommonUtility.GetTokenFromHeaders(req);
            await ValidateJwtToken(accessToken, "https://management.azure.com").ConfigureAwait(false);
            return accessToken;
        }

        public static async Task<string> VerifyAzureStorageHeaderTokenIsValid(HttpRequest req)
        {
            string accessToken = CommonUtility.GetTokenFromHeaders(req);
            await ValidateJwtToken(accessToken, "https://storage.azure.com").ConfigureAwait(false);
            return accessToken;
        }

        private static async Task ValidateJwtToken(string accessToken, string audience)
        {
            try
            {
                var tenantid = Environment.GetEnvironmentVariable("AzureTenantId");
                var jsonWebTokenHandler2 = new JsonWebTokenHandler();
                var json = jsonWebTokenHandler2.ReadJsonWebToken(accessToken);

                var openidConfigManaged = new ConfigurationManager<OpenIdConnectConfiguration>(
                    $"https://login.microsoftonline.com/{tenantid}/v2.0/.well-known/openid-configuration",
                    new OpenIdConnectConfigurationRetriever(),
                    new HttpDocumentRetriever());
                var config = await openidConfigManaged.GetConfigurationAsync().ConfigureAwait(false);

                var tokenValidationParameters = new TokenValidationParameters()
                {
                    RequireAudience = true,
                    RequireExpirationTime = true,
                    ValidateAudience = true,
                    ValidateIssuer = true,
                    ValidateLifetime = true,
                    // The Audience should be the requested resource => client_id and or resource identifier.
                    // Refer to the "aud" claim in the token
                    ValidAudiences = new[] { audience },
                    // The issuer is the identity provider
                    // Refer to the "iss" claim in the token
                    ValidIssuers = new[] { $"https://sts.windows.net/{tenantid}/" },
                    IssuerSigningKeys = config.SigningKeys
                };
                var jsonWebTokenHandler = new JwtSecurityTokenHandler();
                var claimPrincipal = jsonWebTokenHandler.ValidateToken(accessToken, tokenValidationParameters, out _);

                if (!claimPrincipal.Claims.Any())
                {
                    throw new UnauthorizedAccessException("Azure token did not pass validation");
                }
            }
            catch (Exception)
            {
                throw new UnauthorizedAccessException("Azure token did not pass validation");
            }
        }

        // GET https://management.azure.com/subscriptions?api-version=2018-02-01 but using sdk instead
        public static async Task<List<AzureSubscription>> ListSubscriptionsAsync(string access_token)
        {
            var credential = new StaticAccessTokenCredential(access_token);
            var armClient = new ArmClient(credential);
            var subscriptions = armClient.GetSubscriptions();
            var result = new List<AzureSubscription>();
            await foreach (var sub in subscriptions.GetAllAsync())
            {
                result.Add(new AzureSubscription()
                {
                    Id = sub.Id.ToString(),
                    SubscriptionId = sub.Data.SubscriptionId,
                    DisplayName = sub.Data.DisplayName ?? "",
                    TenantId = sub.Data.TenantId?.ToString() ?? "",
                    State = sub.Data.State?.ToString() ?? ""
                });
            }
            return result.OrderBy(x => x.DisplayName).ToList();
        }

        /// <summary>
        /// Wraps a raw access token string into an Azure.Core.TokenCredential for use with ArmClient.
        /// </summary>
        private class StaticAccessTokenCredential : TokenCredential
        {
            private readonly AccessToken _accessToken;

            public StaticAccessTokenCredential(string token)
            {
                _accessToken = new AccessToken(token, DateTimeOffset.UtcNow.AddHours(1));
            }

            public override AccessToken GetToken(TokenRequestContext requestContext, System.Threading.CancellationToken cancellationToken) => _accessToken;

            public override ValueTask<AccessToken> GetTokenAsync(TokenRequestContext requestContext, System.Threading.CancellationToken cancellationToken) =>
                new ValueTask<AccessToken>(_accessToken);
        }

        public static async Task<List<AzureResource>> ListResourceGroupsAsync(string access_token, string subscriptionId)
        {
            var result = new List<AzureResource>();
            using HttpClient client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", access_token);
            var urlGet = $"https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups?api-version=2021-04-01";

            HttpResponseMessage response = await client.GetAsync(urlGet).ConfigureAwait(false);
            var data = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (response.IsSuccessStatusCode)
            {
                var rawResult = JsonConvert.DeserializeObject<RawAzureResourceGroups>(data)!;
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
            var data = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (response.IsSuccessStatusCode)
            {
                var rawResult = JsonConvert.DeserializeObject<RawAzureBlobContainers>(data)!;
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
            var data = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (response.IsSuccessStatusCode)
            {
                var rawResult = JsonConvert.DeserializeObject<RawAzureContainer>(data)!;
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

        public async Task UploadBlobAsync(string blobPath, byte[] data, string contentType)
        {
            BlobClient blobClient = ContainerClient.GetBlobClient(blobPath);
            using var stream = new MemoryStream(data);
            var options = new BlobUploadOptions
            {
                HttpHeaders = new BlobHttpHeaders { ContentType = contentType }
            };
            await blobClient.UploadAsync(stream, options).ConfigureAwait(false);
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

        // filePath = "2011 PhotoShoot Feng/Feng-1.jpg"
        public async Task<IActionResult> GetHttpItemJsonAsync(string filePath)
        {
            var blobdata = await GetBlobItemAsync(filePath).ConfigureAwait(false);
            MemoryStream memoryStream = new MemoryStream();
            await blobdata.Content.CopyToAsync(memoryStream).ConfigureAwait(false);
            memoryStream.Position = 0;
            var imageContent = memoryStream.ToArray();

            return new OkObjectResult(new ItemJsonUI
            {
                // blobdata.Details.LastAccessed,
                LastModified = $"{blobdata.Details.LastModified}",
                ContentLength = blobdata.Details.ContentLength,
                ContentLengthFriendly = CommonUtility.ToFileSize(blobdata.Details.ContentLength),
                ContentType = blobdata.Details.ContentType,
                Metadata = blobdata.Details.Metadata,
                ItemPath = filePath,
                ItemName = filePath.GetItemNameFromPath(),
                ItemType = filePath.GetItemTypeFromPath(),
                ImageContent = $"data:{blobdata.Details.ContentType};base64,{Convert.ToBase64String(imageContent)}"
            });
        }
    }
}

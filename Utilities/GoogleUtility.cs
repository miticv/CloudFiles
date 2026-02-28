using CloudFiles.Models;
using CloudFiles.Models.Google;
using Microsoft.AspNetCore.Http;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using System.Net;

namespace CloudFiles.Utilities
{
    // https://console.cloud.google.com/apis/credentials?project=mindful-span-318701
    // it needs this scope: https://www.googleapis.com/auth/photoslibrary
    public sealed class GoogleUtility
    {
        private string GoogleBucket { get; set; }
        private string GoogleToken { get; set; }

        private GoogleUtility() {}

        public static GoogleUtility Create(string accessToken) {
            return new GoogleUtility { GoogleToken = accessToken };
        }

        public static GoogleUtility Create(string accessToken, string bucket) {
            return new GoogleUtility { GoogleToken = accessToken, GoogleBucket = bucket };
        }

        public static async Task<string> CopyBytesToGooglePhotosAsync(MemoryStream blobDataStream, string accessToken, string contentType)
        {
            blobDataStream.Position = 0;

            using HttpClient client = new HttpClient();
            byte[] imageData = blobDataStream.ToArray();

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            client.DefaultRequestHeaders.Add("x-goog-upload-content-type", contentType);
            client.DefaultRequestHeaders.Add("x-goog-upload-protocol", "raw");
            ByteArrayContent fileContent = new ByteArrayContent(blobDataStream.ToArray()); //  --data '/9j/4SU2RXhpZgAA...
            fileContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);

            HttpResponseMessage response = await client.PostAsync("https://photoslibrary.googleapis.com/v1/uploads", fileContent).ConfigureAwait(false);
            var uploadToken = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (response.IsSuccessStatusCode)
            {
                return uploadToken;
            }
            else
            {
                throw new InvalidOperationException($"CopyBytesToGooglePhotosAsync error: {uploadToken}");
            }
        }

        public static async Task<NewMediaItemResultRoot> SaveMediaItemsToGooglePhotosAsync(ItemPrepared item)
        {
            using HttpClient client = new HttpClient();

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", item.AccessToken);

            NewMediaItemRoot body = new NewMediaItemRoot()
            {
                AlbumId = item.AlbumId,
                NewMediaItems = new List<NewMediaItem>()
            };
            SimpleMediaItem simpleItem = new SimpleMediaItem()
            {
                FileName = item.ItemFilename,
                UploadToken = item.UploadToken
            };
            body.NewMediaItems.Add(new NewMediaItem() { SimpleMediaItem = simpleItem, Description = "" });

            string serializedBody = JsonConvert.SerializeObject(body);

            HttpResponseMessage response = await client.PostAsync("https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate",
                new StringContent(serializedBody, Encoding.UTF8, "application/json")).ConfigureAwait(false);
            string result = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (response.IsSuccessStatusCode)
            {
                return JsonConvert.DeserializeObject<NewMediaItemResultRoot>(result);
            }
            else
            {
                throw new InvalidOperationException($"SaveMediaItemsToGooglePhotosAsync error: {result}");
            }
        }

        public static async Task<AlbumListResponse> ListAlbumsAsync(string accessToken, string nextPageToken)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            if (client.DefaultRequestHeaders.Accept?.Any(m => m.MediaType == "application/json") != true)
            {
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            }
            var nextPage = string.IsNullOrEmpty(nextPageToken) ? "" : $"pageToken={nextPageToken}&";
            var getUrl = $"https://photoslibrary.googleapis.com/v1/albums?{nextPage}pageSize=50";

            var response = await client.GetAsync(getUrl).ConfigureAwait(false);
            var result = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (response.IsSuccessStatusCode)
            {
                return JsonConvert.DeserializeObject<AlbumListResponse>(result);
            }
            else
            {
                throw new InvalidOperationException($"ListAlbumsAsync error: {result}");
            }
        }

        public static async Task<AlbumCreateResponse> AddAlbumAsync(string accessToken, string title)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            if (client.DefaultRequestHeaders.Accept?.Any(m => m.MediaType == "application/json") != true)
            {
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            }
            var body = new AlbumCreateRequest() { Album = new AlbumCreate() { Title = title } };
            var serializedBody = JsonConvert.SerializeObject(body);

            var response = await client.PostAsync("https://photoslibrary.googleapis.com/v1/albums",
                new StringContent(serializedBody, Encoding.UTF8, "application/json")).ConfigureAwait(false);

            var result = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (response.IsSuccessStatusCode)
            {
                return JsonConvert.DeserializeObject<AlbumCreateResponse>(result);
            }
            else
            {
                throw new InvalidOperationException($"AddAlbumAsync error: {result}");
            }
        }

        public static async Task<MediaItemSearchResponse> ListMediaItemsAsync(string accessToken, string albumId, string nextPageToken)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            if (client.DefaultRequestHeaders.Accept?.Any(m => m.MediaType == "application/json") != true)
            {
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            }

            var body = new MediaItemSearchRequest
            {
                AlbumId = albumId,
                PageSize = 50,
                PageToken = string.IsNullOrEmpty(nextPageToken) ? null : nextPageToken
            };
            var serializedBody = JsonConvert.SerializeObject(body, new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore });

            var response = await client.PostAsync("https://photoslibrary.googleapis.com/v1/mediaItems:search",
                new StringContent(serializedBody, Encoding.UTF8, "application/json")).ConfigureAwait(false);
            var result = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (response.IsSuccessStatusCode)
            {
                return JsonConvert.DeserializeObject<MediaItemSearchResponse>(result);
            }
            else
            {
                throw new InvalidOperationException($"ListMediaItemsAsync error: {result}");
            }
        }

        // Google Photos uses opaque OAuth2 access tokens (not JWTs), so the tokeninfo
        // endpoint is the standard introspection method for validating these tokens.
        public static async Task<VerifyToken> VerifyAccessToken(string accessToken)
        {
            using var client = new HttpClient();
            var getUrl = $"https://www.googleapis.com/oauth2/v3/tokeninfo?access_token={accessToken}";

            var response = await client.GetAsync(getUrl).ConfigureAwait(false);
            var result = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (response.IsSuccessStatusCode)
            {
                return JsonConvert.DeserializeObject<VerifyToken>(result);
            }
            else
            {
                throw new UnauthorizedAccessException(result);
            }
        }

        public static async Task<string> VerifyGoogleHeaderTokenIsValid(HttpRequest req)
        {
            var (accessToken, _) = await VerifyGoogleHeaderTokenWithEmail(req).ConfigureAwait(false);
            return accessToken;
        }

        public static async Task<(string accessToken, string email)> VerifyGoogleHeaderTokenWithEmail(HttpRequest req)
        {
            var accessToken = CommonUtility.GetTokenFromHeaders(req);
            var result = await VerifyAccessToken(accessToken).ConfigureAwait(false);

            if (result.Aud != result.Azp ||
               !(result.Scope.Contains("photoslibrary") ||
                 result.Scope.Contains("photospicker.mediaitems.readonly") ||
                 result.Scope.Contains("devstorage")) ||
               result.Aud != Environment.GetEnvironmentVariable("GooglePhotoClientId") ||
               !int.TryParse(result.Exp, out int expiration) ||
               expiration < 0 ) {
                throw new UnauthorizedAccessException("Google token did not pass validation");
            }
            return (accessToken, result.Email ?? "");
        }

        /**
         * Get all files within the prefix folder
         */
        public async Task<List<GoogleItem>> ItemsHierarchicalDeepListingAsync(string folderPath)
        {
            var result = new List<GoogleItem>();
            var nextPageToken = "";

            do
            {
                var page = await GoogleStorageListItemsAsync(folderPath, nextPageToken).ConfigureAwait(false);
                foreach (var p in page.Items)
                {
                    result.Add(new GoogleItem(p.Name, false, p.ContentType, p.MediaLink));
                }

                nextPageToken = page.NextPageToken;
            } while (!string.IsNullOrEmpty(nextPageToken));

            return result;
        }

        public async Task<List<GoogleItem>> SelectionToHierarchicalDeepListingAsync(List<Item> itemList)
        {
            var result = new List<GoogleItem>();
            foreach (Item item in itemList)
            {
                result.AddRange(await ItemsHierarchicalDeepListingAsync(item.ItemPath).ConfigureAwait(false));
            }
            return result;
        }

        // https://storage.googleapis.com/storage/v1/b?project={projectId}
        public async Task<List<GoogleBucketItem>> ListBucketsAsync(string projectId)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", this.GoogleToken);
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var getUrl = $"https://storage.googleapis.com/storage/v1/b?project={Uri.EscapeDataString(projectId)}";
            var response = await client.GetAsync(getUrl).ConfigureAwait(false);
            var result = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (response.IsSuccessStatusCode)
            {
                var parsed = JsonConvert.DeserializeObject<GoogleBucketListResponse>(result);
                return parsed?.Items ?? new List<GoogleBucketItem>();
            }
            else
            {
                throw new InvalidOperationException($"ListBucketsAsync error: {result}");
            }
        }

        // https://storage.googleapis.com/storage/v1/b/vlad-test123/o
        public async Task<List<Item>> ItemShallowListingAsync(string prefix)
        {
            var result = new Dictionary<string, bool>();
            var nextPageToken = "";
            var speedFolder = new Guid().ToString();
            do
            {
                var page = await GoogleStorageListItemsAsync(prefix, nextPageToken).ConfigureAwait(false);
                foreach (var p in page.Items)
                {
                    if (!p.Name.StartsWith(speedFolder))
                    {
                        var folders = p.Name.Replace(prefix + "/", "").Split("/");
                        result.TryAdd(speedFolder, folders.Length > 1);
                        speedFolder = folders[0];
                    }
                }

                nextPageToken = page.NextPageToken;
            } while (!string.IsNullOrEmpty(nextPageToken));

            return result.Select(s => new Item(s.Key, s.Value)).ToList();
        }

        // https://storage.googleapis.com/storage/v1/b/vlad-test123/o?prefix=2000
        private async Task<GoogleStorageFileRoot> GoogleStorageListItemsAsync(string prefix, string pageToken)
        {
            // var accessToken = await GetServiceAccessTokenFromJSONKeyAsync("service_account.secret.json").ConfigureAwait(false);
            var queryPrefix = $"?prefix={prefix}";
            var queryPageToken = String.IsNullOrEmpty(pageToken) ? "" : $"&pageToken={pageToken}";

            // Call the listing operation and return pages of the specified size.
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", this.GoogleToken);
            if (client.DefaultRequestHeaders.Accept?.Any(m => m.MediaType == "application/json") != true)
            {
                client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            }
            var getUrl = $"https://storage.googleapis.com/storage/v1/b/{this.GoogleBucket}/o{queryPrefix}{queryPageToken}";

            var response = await client.GetAsync(getUrl).ConfigureAwait(false);
            var result = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (response.IsSuccessStatusCode)
            {
                return JsonConvert.DeserializeObject<GoogleStorageFileRoot>(result);
            }
            else
            {
                throw new InvalidOperationException($"ListAlbumsAsync error: {result}");
            }
        }

        // --- Google Photos Picker API ---

        public static async Task<PickingSession> CreatePickerSessionAsync(string accessToken)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var response = await client.PostAsync("https://photospicker.googleapis.com/v1/sessions",
                new StringContent("{}", Encoding.UTF8, "application/json")).ConfigureAwait(false);
            var result = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (response.IsSuccessStatusCode)
            {
                return JsonConvert.DeserializeObject<PickingSession>(result);
            }
            else
            {
                throw new InvalidOperationException($"CreatePickerSessionAsync error: {result}");
            }
        }

        public static async Task<PickingSession> GetPickerSessionAsync(string accessToken, string sessionId)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var response = await client.GetAsync($"https://photospicker.googleapis.com/v1/sessions/{sessionId}").ConfigureAwait(false);
            var result = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (response.IsSuccessStatusCode)
            {
                return JsonConvert.DeserializeObject<PickingSession>(result);
            }
            else
            {
                throw new InvalidOperationException($"GetPickerSessionAsync error: {result}");
            }
        }

        public static async Task<PickedMediaItemsResponse> ListPickedMediaItemsAsync(string accessToken, string sessionId, string pageToken)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var nextPage = string.IsNullOrEmpty(pageToken) ? "" : $"&pageToken={pageToken}";
            var getUrl = $"https://photospicker.googleapis.com/v1/mediaItems?sessionId={sessionId}&pageSize=100{nextPage}";

            var response = await client.GetAsync(getUrl).ConfigureAwait(false);
            var result = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (response.IsSuccessStatusCode)
            {
                return JsonConvert.DeserializeObject<PickedMediaItemsResponse>(result);
            }
            else
            {
                throw new InvalidOperationException($"ListPickedMediaItemsAsync error: {result}");
            }
        }

        public static async Task DeletePickerSessionAsync(string accessToken, string sessionId)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await client.DeleteAsync($"https://photospicker.googleapis.com/v1/sessions/{sessionId}").ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                throw new InvalidOperationException($"DeletePickerSessionAsync error: {result}");
            }
        }

        public static async Task<(byte[] Data, string ContentType)> ProxyPickerImageAsync(string imageUrl, string accessToken)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await client.GetAsync(imageUrl).ConfigureAwait(false);
            if (response.IsSuccessStatusCode)
            {
                var data = await response.Content.ReadAsByteArrayAsync().ConfigureAwait(false);
                var contentType = response.Content.Headers.ContentType?.MediaType ?? "image/jpeg";
                return (data, contentType);
            }
            else
            {
                throw new InvalidOperationException($"ProxyPickerImageAsync error: {response.StatusCode}");
            }
        }

        public static async Task<byte[]> GetImageFromUrlAsync(string mediaUrl, string accessToken)
        {
            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            if (httpClient.DefaultRequestHeaders.Accept?.Any(m => m.MediaType == "application/json") != true)
            {
                httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            }

            using var httpResponse = await httpClient.GetAsync(mediaUrl).ConfigureAwait(false);
            if (httpResponse.StatusCode == HttpStatusCode.OK)
            {
                return await httpResponse.Content.ReadAsByteArrayAsync().ConfigureAwait(false);
            }
            else
            {
                throw new InvalidOperationException("Url is Invalid");
            }
        }
    }
}

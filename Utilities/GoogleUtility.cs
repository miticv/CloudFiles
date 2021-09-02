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
using Google.Apis.Auth.OAuth2;
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

        public static async Task<GoogleUtility> CreateAsync() {
            var newInstance = new GoogleUtility
            {
                GoogleBucket = Environment.GetEnvironmentVariable("GoogleBucket")
            };
            newInstance.GoogleToken = await GetServiceAccessTokenFromJSONKey(Environment.GetEnvironmentVariable("GoogleServiceJsonFileName")).ConfigureAwait(false);

            return newInstance;
        }

        public string GetServiceToken()
        {
            return this.GoogleToken;
            // return  await GetServiceAccessTokenFromJSONKeyAsync("service_account.secret.json").ConfigureAwait(false);
        }

        private static async Task<string> GetServiceAccessTokenFromJSONKey(string jsonKeyFilePath)
        {
            var scopes = new string[] {
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/devstorage.read_only",
                "https://www.googleapis.com/auth/photoslibrary" };

            using var stream = new FileStream(jsonKeyFilePath, FileMode.Open, FileAccess.Read);
            return (await GoogleCredential
                .FromStream(stream) // Loads key file
                .CreateScoped(scopes) // Gathers scopes requested
                .UnderlyingCredential // Gets the credentials
                .GetAccessTokenForRequestAsync()
                .ConfigureAwait(false)) // Gets the Access Token
                .Trim(new char[] { '.' });
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
            var uploadToken = response.Content.ReadAsStringAsync().Result;

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
                new StringContent(serializedBody, Encoding.UTF8, "application/json")).ConfigureAwait(false);  // is this should be application/json?
            string result = response.Content.ReadAsStringAsync().Result;

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
            var getUrl = $"https://photoslibrary.googleapis.com/v1/albums?{nextPage}pageSize=50&excludeNonAppCreatedData=false"; // ORDER Of query items matter!!!!!

            var response = await client.GetAsync(getUrl).ConfigureAwait(false);
            var result = response.Content.ReadAsStringAsync().Result;

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

            var result = response.Content.ReadAsStringAsync().Result;

            if (response.IsSuccessStatusCode)
            {
                return JsonConvert.DeserializeObject<AlbumCreateResponse>(result);
            }
            else
            {
                throw new InvalidOperationException($"AddAlbumAsync error: {result}");
            }
        }

        public static async Task<VerifyToken> VerifyAccessToken(string accessToken)
        {
            using var client = new HttpClient();
            var getUrl = $"https://www.googleapis.com/oauth2/v3/tokeninfo?access_token={accessToken}";

            var response = await client.GetAsync(getUrl).ConfigureAwait(false);
            var result = response.Content.ReadAsStringAsync().Result;

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
            var accessToken = CommonUtility.GetTokenFromHeaders(req);
            // CommonUtility.ValidateJwtToken(accessToken);//  google does not use JWT token! Cannot use this to validate
            var result = await VerifyAccessToken(accessToken).ConfigureAwait(false);

            /**
            {
                "azp": "994937085571-c3hodle0mbu7aq82dtp36bint621khjh.apps.googleusercontent.com",
                "aud": "994937085571-c3hodle0mbu7aq82dtp36bint621khjh.apps.googleusercontent.com",
                "scope": "https://www.googleapis.com/auth/photoslibrary",
                "exp": "1630215435",
                "expires_in": "1856",
                "access_type": "online"
            }
            */

            if (result.Aud != result.Azp ||
               result.Scope != "https://www.googleapis.com/auth/photoslibrary" ||
               result.Aud != Environment.GetEnvironmentVariable("GooglePhotoClientId") ||
               !int.TryParse(result.Exp, out int expiration) ||
               expiration < 0 ) {
                throw new UnauthorizedAccessException("Google token did not pass validation");
            }
            return accessToken;
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
            var result = response.Content.ReadAsStringAsync().Result;

            if (response.IsSuccessStatusCode)
            {
                return JsonConvert.DeserializeObject<GoogleStorageFileRoot>(result);
            }
            else
            {
                throw new InvalidOperationException($"ListAlbumsAsync error: {result}");
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

            var bucketName = Environment.GetEnvironmentVariable("GoogleBucket");
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

using AdaFile.Models;
using AdaFile.Models.Google;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace AdaFile.Utilities
{
    // https://console.cloud.google.com/apis/credentials?project=mindful-span-318701
    public static class GoogleUtility
    {
        public static async Task<string> CopyBytesToGooglePhotosAsync(MemoryStream blobDataStream, string accessToken, string contentType)
        {
            blobDataStream.Position = 0;

            using HttpClient client = new HttpClient();
            byte[] imageData = blobDataStream.ToArray();

            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            client.DefaultRequestHeaders.Add("x-goog-upload-content-type", contentType);
            client.DefaultRequestHeaders.Add("x-goog-upload-protocol", "raw");
            ByteArrayContent fileContent = new ByteArrayContent(blobDataStream.ToArray()); //  --data '/9j/4SU2RXhpZgAA...
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);

            HttpResponseMessage response = await client.PostAsync("https://photoslibrary.googleapis.com/v1/uploads", fileContent).ConfigureAwait(false);
            var uploadToken = response.Content.ReadAsStringAsync().Result;

            if (response.IsSuccessStatusCode)
            {
                return uploadToken;
            }
            else
            {
                throw new InvalidOperationException(uploadToken);
            }
        }

        public static async Task<NewMediaItemResultRoot> SaveMediaItemsToGooglePhotosAsync(ItemExpanded item)
        {
            using HttpClient client = new HttpClient();

            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", item.AccessToken);
            client.DefaultRequestHeaders.Add("Content-Type", "application/json");

            NewMediaItemRoot body = new NewMediaItemRoot
            {
                AlbumId = item.AlbumId,
                NewMediaItems = new List<NewMediaItem>()
            };
            SimpleMediaItem simpleItem = new SimpleMediaItem
            {
                FileName = item.ItemFilename,
                UploadToken = item.UploadToken
            };
            body.NewMediaItems.Add(new NewMediaItem() { SimpleMediaItem = simpleItem, Description = "" });

            string serializedBody = JsonConvert.SerializeObject(body);

            HttpResponseMessage response = await client.PostAsync("https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate",
                new StringContent(serializedBody, Encoding.UTF8, "application/json")).ConfigureAwait(false);
            string result = response.Content.ReadAsStringAsync().Result;

            if (response.IsSuccessStatusCode)
            {
                return JsonConvert.DeserializeObject<NewMediaItemResultRoot>(result);
            }
            else
            {
                throw new InvalidOperationException(result);
            }
        }

        // it needs this scope: https://www.googleapis.com/auth/photoslibrary
        public static async Task<GoogleTokenResponse> GetGoogleAccessTokenAsync(string clientId, string clientSecret, string code, string redirectUrl)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("Content-Type", "application/json");

            var content = new GoogleTokenRequest
            {
                ClientId = clientId,
                ClientSecret = clientSecret,
                Code = code,
                GrantType = "authorization_code",
                RedirectUri = redirectUrl
            };
            var serializedBody = JsonConvert.SerializeObject(content);

            var response = await client.PostAsync("https://accounts.google.com/o/oauth2/token",
                new StringContent(serializedBody, Encoding.UTF8, "application/json")).ConfigureAwait(false);
            var result = response.Content.ReadAsStringAsync().Result;

            if (response.IsSuccessStatusCode)
            {
                return JsonConvert.DeserializeObject<GoogleTokenResponse>(result);
            }
            else
            {
                throw new InvalidOperationException(result);
            }
        }

        public static async Task<AlbumListResponse> ListAlbumsAsync(string accessToken, string nextPageToken)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            client.DefaultRequestHeaders.Add("Content-Type", "application/json");

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
                throw new InvalidOperationException(result);
            }
        }

        public static async Task<AlbumCreateResponse> AddAlbumAsync(string accessToken, string title)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            client.DefaultRequestHeaders.Add("Content-Type", "application/json");

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
                throw new InvalidOperationException(result);
            }
        }
    }
}

using CloudFiles.Models;
using Microsoft.AspNetCore.Http;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

namespace CloudFiles.Utilities
{
    public sealed class DropboxUtility
    {
        private const string ApiBaseUrl = "https://api.dropboxapi.com/2/";
        private const string ContentBaseUrl = "https://content.dropboxapi.com/2/";

        private string AccessToken { get; set; } = default!;

        private DropboxUtility() {}

        public static DropboxUtility Create(string accessToken)
        {
            return new DropboxUtility { AccessToken = accessToken };
        }

        public static string VerifyDropboxHeaderTokenIsValid(HttpRequest req)
        {
            var accessToken = CommonUtility.GetTokenFromHeaders(req);
            return accessToken;
        }

        // ─── Token Exchange ───

        public static async Task<DropboxTokenResponse> ExchangeCodeForTokenAsync(string code, string redirectUri)
        {
            var clientId = Environment.GetEnvironmentVariable("DropBoxKey");
            var clientSecret = Environment.GetEnvironmentVariable("DropBoxSecret");

            if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
            {
                throw new InvalidOperationException("DropBoxKey and DropBoxSecret must be configured.");
            }

            using var client = new HttpClient();
            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("code", code),
                new KeyValuePair<string, string>("grant_type", "authorization_code"),
                new KeyValuePair<string, string>("client_id", clientId),
                new KeyValuePair<string, string>("client_secret", clientSecret),
                new KeyValuePair<string, string>("redirect_uri", redirectUri)
            });

            var response = await client.PostAsync("https://api.dropboxapi.com/oauth2/token", content).ConfigureAwait(false);
            var result = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (!response.IsSuccessStatusCode)
            {
                throw new UnauthorizedAccessException($"Dropbox token exchange failed: {result}");
            }

            var tokenResult = JsonConvert.DeserializeObject<DropboxOAuthTokenResult>(result);
            if (tokenResult == null || string.IsNullOrEmpty(tokenResult.AccessToken))
            {
                throw new UnauthorizedAccessException($"Dropbox token exchange returned invalid response: {result}");
            }

            return new DropboxTokenResponse
            {
                AccessToken = tokenResult.AccessToken,
                RefreshToken = tokenResult.RefreshToken,
                ExpiresIn = tokenResult.ExpiresIn,
                AccountId = tokenResult.AccountId
            };
        }

        public static async Task<DropboxTokenResponse> RefreshAccessTokenAsync(string refreshToken)
        {
            var clientId = Environment.GetEnvironmentVariable("DropBoxKey");
            var clientSecret = Environment.GetEnvironmentVariable("DropBoxSecret");

            if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
            {
                throw new InvalidOperationException("DropBoxKey and DropBoxSecret must be configured.");
            }

            using var client = new HttpClient();
            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "refresh_token"),
                new KeyValuePair<string, string>("refresh_token", refreshToken),
                new KeyValuePair<string, string>("client_id", clientId),
                new KeyValuePair<string, string>("client_secret", clientSecret)
            });

            var response = await client.PostAsync("https://api.dropboxapi.com/oauth2/token", content).ConfigureAwait(false);
            var result = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (!response.IsSuccessStatusCode)
            {
                throw new UnauthorizedAccessException($"Dropbox token refresh failed: {result}");
            }

            var tokenResult = JsonConvert.DeserializeObject<DropboxOAuthTokenResult>(result);
            if (tokenResult == null || string.IsNullOrEmpty(tokenResult.AccessToken))
            {
                throw new UnauthorizedAccessException($"Dropbox token refresh returned invalid response: {result}");
            }

            return new DropboxTokenResponse
            {
                AccessToken = tokenResult.AccessToken,
                RefreshToken = refreshToken, // refresh_token is not returned on refresh
                ExpiresIn = tokenResult.ExpiresIn,
                AccountId = tokenResult.AccountId
            };
        }

        // ─── Account Info (token validation) ───

        public static async Task<DropboxAccount> GetAccountInfoAsync(string accessToken)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            var content = new StringContent("null", Encoding.UTF8, "application/json");

            var response = await client.PostAsync($"{ApiBaseUrl}users/get_current_account", content).ConfigureAwait(false);
            var result = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (!response.IsSuccessStatusCode)
            {
                throw new UnauthorizedAccessException($"Dropbox token validation failed: {result}");
            }

            var account = JsonConvert.DeserializeObject<DropboxAccount>(result);
            if (account == null || string.IsNullOrEmpty(account.Email))
            {
                throw new UnauthorizedAccessException("Could not extract account info from Dropbox token.");
            }

            return account;
        }

        // ─── List Folder ───

        public async Task<DropboxFolderResponse> ListFolderAsync(string path)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", AccessToken);

            var requestBody = JsonConvert.SerializeObject(new
            {
                path = string.IsNullOrEmpty(path) ? "" : path,
                limit = 100,
                include_media_info = false
            });

            var content = new StringContent(requestBody, Encoding.UTF8, "application/json");
            var response = await client.PostAsync($"{ApiBaseUrl}files/list_folder", content).ConfigureAwait(false);
            var result = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"Dropbox list_folder failed: {result}");
            }

            return ParseFolderResponse(result);
        }

        public async Task<DropboxFolderResponse> ListFolderContinueAsync(string cursor)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", AccessToken);

            var requestBody = JsonConvert.SerializeObject(new { cursor });
            var content = new StringContent(requestBody, Encoding.UTF8, "application/json");
            var response = await client.PostAsync($"{ApiBaseUrl}files/list_folder/continue", content).ConfigureAwait(false);
            var result = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"Dropbox list_folder/continue failed: {result}");
            }

            return ParseFolderResponse(result);
        }

        private static DropboxFolderResponse ParseFolderResponse(string json)
        {
            var raw = JsonConvert.DeserializeObject<DropboxListFolderRawResponse>(json);
            if (raw == null)
            {
                throw new InvalidOperationException($"Dropbox returned unparseable response: {json}");
            }

            var items = (raw.Entries ?? new List<DropboxEntryRaw>())
                .Select(e => new DropboxItem
                {
                    Id = e.Id ?? "",
                    Name = e.Name,
                    PathDisplay = e.PathDisplay,
                    PathLower = e.PathLower,
                    IsFolder = e.Tag == "folder",
                    Size = e.Size ?? 0,
                    ServerModified = e.ServerModified ?? "",
                    ContentHash = e.ContentHash ?? ""
                })
                .OrderByDescending(i => i.IsFolder)
                .ThenBy(i => i.Name)
                .ToList();

            return new DropboxFolderResponse
            {
                Items = items,
                Cursor = raw.Cursor,
                HasMore = raw.HasMore
            };
        }

        // ─── Download ───

        public async Task<(byte[] Data, string ContentType, string Filename)> DownloadFileAsync(string path)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", AccessToken);

            var apiArg = JsonConvert.SerializeObject(new { path });
            client.DefaultRequestHeaders.Add("Dropbox-API-Arg", apiArg);

            var response = await client.PostAsync($"{ContentBaseUrl}files/download", null).ConfigureAwait(false);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                throw new InvalidOperationException($"Dropbox download failed: {errorContent}");
            }

            var data = await response.Content.ReadAsByteArrayAsync().ConfigureAwait(false);
            var contentType = response.Content.Headers.ContentType?.MediaType ?? "application/octet-stream";
            var filename = path.Contains('/') ? path.Substring(path.LastIndexOf('/') + 1) : path;

            return (data, contentType, filename);
        }

        // ─── Upload (simple, <150MB) ───

        public async Task<DropboxEntryRaw> UploadFileAsync(byte[] data, string path)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", AccessToken);

            var apiArg = JsonConvert.SerializeObject(new
            {
                path,
                mode = "add",
                autorename = true,
                mute = false
            });
            client.DefaultRequestHeaders.Add("Dropbox-API-Arg", apiArg);

            var content = new ByteArrayContent(data);
            content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");

            var response = await client.PostAsync($"{ContentBaseUrl}files/upload", content).ConfigureAwait(false);
            var result = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"Dropbox upload failed: {result}");
            }

            return JsonConvert.DeserializeObject<DropboxEntryRaw>(result)!;
        }

        // ─── Deep Listing (for migrations) ───

        public async Task<List<DropboxItem>> DeepListFilesAsync(string folderPath)
        {
            var allFiles = new List<DropboxItem>();
            var response = await ListFolderAsync(folderPath).ConfigureAwait(false);

            foreach (var item in response.Items)
            {
                if (item.IsFolder)
                {
                    var subFiles = await DeepListFilesAsync(item.PathDisplay).ConfigureAwait(false);
                    allFiles.AddRange(subFiles);
                }
                else
                {
                    allFiles.Add(item);
                }
            }

            while (response.HasMore)
            {
                response = await ListFolderContinueAsync(response.Cursor).ConfigureAwait(false);
                foreach (var item in response.Items)
                {
                    if (item.IsFolder)
                    {
                        var subFiles = await DeepListFilesAsync(item.PathDisplay).ConfigureAwait(false);
                        allFiles.AddRange(subFiles);
                    }
                    else
                    {
                        allFiles.Add(item);
                    }
                }
            }

            return allFiles;
        }
    }

    // ─── Dropbox OAuth token result (raw API response) ───

    public class DropboxOAuthTokenResult
    {
        [JsonProperty("access_token")]
        public string AccessToken { get; set; } = default!;

        [JsonProperty("token_type")]
        public string TokenType { get; set; } = default!;

        [JsonProperty("expires_in")]
        public int ExpiresIn { get; set; }

        [JsonProperty("refresh_token")]
        public string RefreshToken { get; set; } = default!;

        [JsonProperty("account_id")]
        public string AccountId { get; set; } = default!;

        [JsonProperty("uid")]
        public string Uid { get; set; } = default!;
    }

    // ─── Dropbox account info ───

    public class DropboxAccount
    {
        [JsonProperty("account_id")]
        public string AccountId { get; set; } = default!;

        [JsonProperty("email")]
        public string Email { get; set; } = default!;

        [JsonProperty("name")]
        public DropboxAccountName Name { get; set; } = default!;
    }

    public class DropboxAccountName
    {
        [JsonProperty("display_name")]
        public string DisplayName { get; set; } = default!;
    }

    // ─── Dropbox raw API response models ───

    public class DropboxListFolderRawResponse
    {
        [JsonProperty("entries")]
        public List<DropboxEntryRaw> Entries { get; set; } = default!;

        [JsonProperty("cursor")]
        public string Cursor { get; set; } = default!;

        [JsonProperty("has_more")]
        public bool HasMore { get; set; }
    }

    public class DropboxEntryRaw
    {
        [JsonProperty(".tag")]
        public string Tag { get; set; } = default!;

        [JsonProperty("id")]
        public string Id { get; set; } = default!;

        [JsonProperty("name")]
        public string Name { get; set; } = default!;

        [JsonProperty("path_lower")]
        public string PathLower { get; set; } = default!;

        [JsonProperty("path_display")]
        public string PathDisplay { get; set; } = default!;

        [JsonProperty("size")]
        public long? Size { get; set; }

        [JsonProperty("client_modified")]
        public string ClientModified { get; set; } = default!;

        [JsonProperty("server_modified")]
        public string ServerModified { get; set; } = default!;

        [JsonProperty("content_hash")]
        public string ContentHash { get; set; } = default!;
    }

    // ─── Dropbox UI response models ───

    public class DropboxItem
    {
        [JsonProperty("id")]
        public string Id { get; set; } = default!;

        [JsonProperty("name")]
        public string Name { get; set; } = default!;

        [JsonProperty("pathDisplay")]
        public string PathDisplay { get; set; } = default!;

        [JsonProperty("pathLower")]
        public string PathLower { get; set; } = default!;

        [JsonProperty("isFolder")]
        public bool IsFolder { get; set; }

        [JsonProperty("size")]
        public long Size { get; set; }

        [JsonProperty("serverModified")]
        public string ServerModified { get; set; } = default!;

        [JsonProperty("contentHash")]
        public string ContentHash { get; set; } = default!;
    }

    public class DropboxFolderResponse
    {
        [JsonProperty("items")]
        public List<DropboxItem> Items { get; set; } = default!;

        [JsonProperty("cursor")]
        public string Cursor { get; set; } = default!;

        [JsonProperty("hasMore")]
        public bool HasMore { get; set; }
    }

    public class DropboxTokenResponse
    {
        [JsonProperty("accessToken")]
        public string AccessToken { get; set; } = default!;

        [JsonProperty("refreshToken")]
        public string RefreshToken { get; set; } = default!;

        [JsonProperty("expiresIn")]
        public int ExpiresIn { get; set; }

        [JsonProperty("accountId")]
        public string AccountId { get; set; } = default!;
    }

    // ─── Dropbox OAuth callback request ───

    public class DropboxOAuthCallbackRequest
    {
        [JsonProperty("code")]
        public string Code { get; set; } = default!;

        [JsonProperty("redirectUri")]
        public string RedirectUri { get; set; } = default!;
    }

    // ─── Dropbox refresh request ───

    public class DropboxRefreshRequest
    {
        [JsonProperty("refreshToken")]
        public string RefreshToken { get; set; } = default!;
    }
}

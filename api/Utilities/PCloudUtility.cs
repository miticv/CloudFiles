using CloudFiles.Models;
using Microsoft.AspNetCore.Http;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

namespace CloudFiles.Utilities
{
    public sealed class PCloudUtility
    {
        private string AccessToken { get; set; } = default!;
        private string ApiHostname { get; set; } = default!;

        private PCloudUtility() {}

        public static PCloudUtility Create(string accessToken, string apiHostname)
        {
            return new PCloudUtility { AccessToken = accessToken, ApiHostname = apiHostname };
        }

        public static (string accessToken, string apiHostname) VerifyPCloudHeaderTokenIsValid(HttpRequest req)
        {
            var accessToken = CommonUtility.GetTokenFromHeaders(req);

            var success = req.Headers.TryGetValue("X-PCloud-Hostname", out var hostnameValues);
            if (!success || hostnameValues.Count == 0 || string.IsNullOrEmpty(hostnameValues.FirstOrDefault()))
            {
                throw new UnauthorizedAccessException("Please include X-PCloud-Hostname header");
            }

            var apiHostname = hostnameValues.FirstOrDefault()!;

            // Validate hostname is one of the two known pCloud API hosts
            if (apiHostname != "api.pcloud.com" && apiHostname != "eapi.pcloud.com")
            {
                throw new UnauthorizedAccessException("Invalid pCloud API hostname");
            }

            return (accessToken, apiHostname);
        }

        public async Task<PCloudFolderResponse> ListFolderAsync(long folderId)
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", AccessToken);

            var url = $"https://{ApiHostname}/listfolder?folderid={folderId}";
            var response = await client.GetAsync(url).ConfigureAwait(false);
            var content = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"pCloud listfolder failed: {content}");
            }

            var result = JsonConvert.DeserializeObject<PCloudApiResponse>(content);
            if (result == null || result.Result != 0)
            {
                throw new InvalidOperationException($"pCloud listfolder error: result={result?.Result}, {content}");
            }

            var metadata = result.Metadata;
            var items = (metadata?.Contents ?? new List<PCloudMetadata>())
                .Select(m => new PCloudItem
                {
                    Name = m.Name,
                    FileId = m.FileId,
                    FolderId = m.FolderId,
                    IsFolder = m.IsFolder,
                    Size = m.Size,
                    ContentType = m.ContentType,
                    Created = m.Created,
                    Modified = m.Modified,
                    ParentFolderId = m.ParentFolderId,
                    Icon = m.Icon
                })
                .OrderByDescending(i => i.IsFolder)
                .ThenBy(i => i.Name)
                .ToList();

            return new PCloudFolderResponse
            {
                Items = items,
                FolderName = metadata?.Name ?? "",
                FolderId = metadata?.FolderId ?? folderId
            };
        }

        public static async Task<PCloudTokenResponse> ExchangeCodeForTokenAsync(string code, string hostname)
        {
            var clientId = Environment.GetEnvironmentVariable("PCloudClientId");
            var clientSecret = Environment.GetEnvironmentVariable("PCloudClientSecret");

            if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
            {
                throw new InvalidOperationException("PCloudClientId and PCloudClientSecret must be configured.");
            }

            using var client = new HttpClient();
            var url = $"https://{hostname}/oauth2_token?client_id={clientId}&client_secret={clientSecret}&code={code}";
            var response = await client.GetAsync(url).ConfigureAwait(false);
            var content = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

            var result = JsonConvert.DeserializeObject<PCloudOAuthTokenResult>(content);
            if (result == null || result.Result != 0 || string.IsNullOrEmpty(result.AccessToken))
            {
                throw new UnauthorizedAccessException($"pCloud token exchange failed: {content}");
            }

            return new PCloudTokenResponse
            {
                AccessToken = result.AccessToken,
                Hostname = hostname
            };
        }
    }

    // ─── pCloud API response models ───

    public class PCloudApiResponse
    {
        [JsonProperty("result")]
        public int Result { get; set; }

        [JsonProperty("metadata")]
        public PCloudMetadata Metadata { get; set; } = default!;
    }

    public class PCloudMetadata
    {
        [JsonProperty("name")]
        public string Name { get; set; } = default!;

        [JsonProperty("fileid")]
        public long FileId { get; set; }

        [JsonProperty("folderid")]
        public long FolderId { get; set; }

        [JsonProperty("isfolder")]
        public bool IsFolder { get; set; }

        [JsonProperty("size")]
        public long Size { get; set; }

        [JsonProperty("contenttype")]
        public string ContentType { get; set; } = default!;

        [JsonProperty("created")]
        public string Created { get; set; } = default!;

        [JsonProperty("modified")]
        public string Modified { get; set; } = default!;

        [JsonProperty("parentfolderid")]
        public long ParentFolderId { get; set; }

        [JsonProperty("icon")]
        public string Icon { get; set; } = default!;

        [JsonProperty("contents")]
        public List<PCloudMetadata> Contents { get; set; } = default!;
    }

    public class PCloudOAuthTokenResult
    {
        [JsonProperty("result")]
        public int Result { get; set; }

        [JsonProperty("access_token")]
        public string AccessToken { get; set; } = default!;

        [JsonProperty("token_type")]
        public string TokenType { get; set; } = default!;

        [JsonProperty("uid")]
        public long Uid { get; set; }
    }

    // ─── UI response models ───

    public class PCloudItem
    {
        [JsonProperty("name")]
        public string Name { get; set; } = default!;

        [JsonProperty("fileId")]
        public long FileId { get; set; }

        [JsonProperty("folderId")]
        public long FolderId { get; set; }

        [JsonProperty("isFolder")]
        public bool IsFolder { get; set; }

        [JsonProperty("size")]
        public long Size { get; set; }

        [JsonProperty("contentType")]
        public string ContentType { get; set; } = default!;

        [JsonProperty("created")]
        public string Created { get; set; } = default!;

        [JsonProperty("modified")]
        public string Modified { get; set; } = default!;

        [JsonProperty("parentFolderId")]
        public long ParentFolderId { get; set; }

        [JsonProperty("icon")]
        public string Icon { get; set; } = default!;
    }

    public class PCloudFolderResponse
    {
        [JsonProperty("items")]
        public List<PCloudItem> Items { get; set; } = default!;

        [JsonProperty("folderName")]
        public string FolderName { get; set; } = default!;

        [JsonProperty("folderId")]
        public long FolderId { get; set; }
    }

    public class PCloudTokenResponse
    {
        [JsonProperty("accessToken")]
        public string AccessToken { get; set; } = default!;

        [JsonProperty("hostname")]
        public string Hostname { get; set; } = default!;
    }
}

using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;

namespace CloudFiles.Models.Google
{
    // GoogleStorageFileRoot myDeserializedClass = JsonConvert.DeserializeObject<GoogleStorageFileRoot>(myJsonResponse);
    public class GoogleStorageFileItem
    {
        [JsonProperty("kind")]
        public string Kind { get; set; } = default!;

        [JsonProperty("id")]
        public string Id { get; set; } = default!;

        [JsonProperty("selfLink")]
        public string SelfLink { get; set; } = default!;

        [JsonProperty("mediaLink")]
        public string MediaLink { get; set; } = default!;

        [JsonProperty("name")]
        public string Name { get; set; } = default!;

        [JsonProperty("bucket")]
        public string Bucket { get; set; } = default!;

        [JsonProperty("generation")]
        public string Generation { get; set; } = default!;

        [JsonProperty("metageneration")]
        public string Metageneration { get; set; } = default!;

        [JsonProperty("contentType")]
        public string ContentType { get; set; } = default!;

        [JsonProperty("storageClass")]
        public string StorageClass { get; set; } = default!;

        [JsonProperty("size")]
        public string Size { get; set; } = default!;

        [JsonProperty("md5Hash")]
        public string Md5Hash { get; set; } = default!;

        [JsonProperty("crc32c")]
        public string Crc32c { get; set; } = default!;

        [JsonProperty("etag")]
        public string Etag { get; set; } = default!;

        [JsonProperty("retentionExpirationTime")]
        public DateTime RetentionExpirationTime { get; set; }

        [JsonProperty("timeCreated")]
        public DateTime TimeCreated { get; set; }

        [JsonProperty("updated")]
        public DateTime Updated { get; set; }

        [JsonProperty("timeStorageClassUpdated")]
        public DateTime TimeStorageClassUpdated { get; set; }
    }

    public class GoogleStorageFileRoot
    {
        [JsonProperty("kind")]
        public string Kind { get; set; } = default!;

        [JsonProperty("nextPageToken")]
        public string NextPageToken { get; set; } = default!;

        [JsonProperty("items")]
        public List<GoogleStorageFileItem> Items { get; set; } = default!;
    }
}

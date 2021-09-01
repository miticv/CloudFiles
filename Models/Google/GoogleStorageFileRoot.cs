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
        public string Kind { get; set; }

        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("selfLink")]
        public string SelfLink { get; set; }

        [JsonProperty("mediaLink")]
        public string MediaLink { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("bucket")]
        public string Bucket { get; set; }

        [JsonProperty("generation")]
        public string Generation { get; set; }

        [JsonProperty("metageneration")]
        public string Metageneration { get; set; }

        [JsonProperty("contentType")]
        public string ContentType { get; set; }

        [JsonProperty("storageClass")]
        public string StorageClass { get; set; }

        [JsonProperty("size")]
        public string Size { get; set; }

        [JsonProperty("md5Hash")]
        public string Md5Hash { get; set; }

        [JsonProperty("crc32c")]
        public string Crc32c { get; set; }

        [JsonProperty("etag")]
        public string Etag { get; set; }

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
        public string Kind { get; set; }

        [JsonProperty("nextPageToken")]
        public string NextPageToken { get; set; }

        [JsonProperty("items")]
        public List<GoogleStorageFileItem> Items { get; set; }
    }
}

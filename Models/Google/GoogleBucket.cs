using System.Collections.Generic;
using Newtonsoft.Json;

namespace CloudFiles.Models.Google
{
    public class GoogleBucketListResponse
    {
        [JsonProperty("items")]
        public List<GoogleBucketItem> Items { get; set; }
    }

    public class GoogleBucketItem
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("location")]
        public string Location { get; set; }

        [JsonProperty("storageClass")]
        public string StorageClass { get; set; }

        [JsonProperty("timeCreated")]
        public string TimeCreated { get; set; }
    }
}

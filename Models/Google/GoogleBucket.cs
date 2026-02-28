using System.Collections.Generic;
using Newtonsoft.Json;

namespace CloudFiles.Models.Google
{
    public class GoogleBucketListResponse
    {
        [JsonProperty("items")]
        public List<GoogleBucketItem> Items { get; set; } = default!;
    }

    public class GoogleBucketItem
    {
        [JsonProperty("name")]
        public string Name { get; set; } = default!;

        [JsonProperty("location")]
        public string Location { get; set; } = default!;

        [JsonProperty("storageClass")]
        public string StorageClass { get; set; } = default!;

        [JsonProperty("timeCreated")]
        public string TimeCreated { get; set; } = default!;
    }
}

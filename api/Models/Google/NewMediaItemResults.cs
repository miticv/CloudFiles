using Newtonsoft.Json;
using System;
using System.Collections.Generic;

namespace CloudFiles.Models.Google
{
    // Root myDeserializedClass = JsonConvert.DeserializeObject<NewMediaItemResultRoot>(myJsonResponse);
    public class Status
    {
        [JsonProperty("message")]
        public string Message { get; set; } = default!;
    }

    public class MediaMetadata
    {
        [JsonProperty("creationTime")]
        public DateTime CreationTime { get; set; }

        [JsonProperty("width")]
        public string Width { get; set; } = default!;

        [JsonProperty("height")]
        public string Height { get; set; } = default!;
    }

    public class MediaItem
    {
        [JsonProperty("id")]
        public string Id { get; set; } = default!;

        [JsonProperty("description")]
        public string Description { get; set; } = default!;

        [JsonProperty("baseUrl")]
        public string BaseUrl { get; set; } = default!;

        [JsonProperty("productUrl")]
        public string ProductUrl { get; set; } = default!;

        [JsonProperty("mimeType")]
        public string MimeType { get; set; } = default!;

        [JsonProperty("mediaMetadata")]
        public MediaMetadata MediaMetadata { get; set; } = default!;

        [JsonProperty("filename")]
        public string Filename { get; set; } = default!;
    }

    public class NewMediaItemResult
    {
        [JsonProperty("uploadToken")]
        public string UploadToken { get; set; } = default!;

        [JsonProperty("status")]
        public Status Status { get; set; } = default!;

        [JsonProperty("mediaItem")]
        public MediaItem MediaItem { get; set; } = default!;
    }

    public class NewMediaItemResultRoot
    {
        [JsonProperty("newMediaItemResults")]
        public List<NewMediaItemResult> NewMediaItemResults { get; set; } = default!;
    }
}

using Newtonsoft.Json;
using System;
using System.Collections.Generic;

namespace CloudFiles.Models.Google
{
    // Root myDeserializedClass = JsonConvert.DeserializeObject<NewMediaItemResultRoot>(myJsonResponse);
    public class Status
    {
        [JsonProperty("message")]
        public string Message { get; set; }
    }

    public class MediaMetadata
    {
        [JsonProperty("creationTime")]
        public DateTime CreationTime { get; set; }

        [JsonProperty("width")]
        public string Width { get; set; }

        [JsonProperty("height")]
        public string Height { get; set; }
    }

    public class MediaItem
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("description")]
        public string Description { get; set; }

        [JsonProperty("baseUrl")]
        public string BaseUrl { get; set; }

        [JsonProperty("productUrl")]
        public string ProductUrl { get; set; }

        [JsonProperty("mimeType")]
        public string MimeType { get; set; }

        [JsonProperty("mediaMetadata")]
        public MediaMetadata MediaMetadata { get; set; }

        [JsonProperty("filename")]
        public string Filename { get; set; }
    }

    public class NewMediaItemResult
    {
        [JsonProperty("uploadToken")]
        public string UploadToken { get; set; }

        [JsonProperty("status")]
        public Status Status { get; set; }

        [JsonProperty("mediaItem")]
        public MediaItem MediaItem { get; set; }
    }

    public class NewMediaItemResultRoot
    {
        [JsonProperty("newMediaItemResults")]
        public List<NewMediaItemResult> NewMediaItemResults { get; set; }
    }
}

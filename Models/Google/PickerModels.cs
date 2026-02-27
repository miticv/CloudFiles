using Newtonsoft.Json;
using System.Collections.Generic;

namespace CloudFiles.Models.Google
{
    public class PickingSession
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("pickerUri")]
        public string PickerUri { get; set; }

        [JsonProperty("pollingConfig")]
        public PollingConfig PollingConfig { get; set; }

        [JsonProperty("mediaItemsSet")]
        public bool MediaItemsSet { get; set; }

        [JsonProperty("expireTime")]
        public string ExpireTime { get; set; }
    }

    public class PollingConfig
    {
        [JsonProperty("pollInterval")]
        public string PollInterval { get; set; }

        [JsonProperty("timeoutIn")]
        public string TimeoutIn { get; set; }
    }

    public class PickedMediaItem
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("createTime")]
        public string CreateTime { get; set; }

        [JsonProperty("type")]
        public string Type { get; set; }

        [JsonProperty("mediaFile")]
        public MediaFile MediaFile { get; set; }
    }

    public class MediaFile
    {
        [JsonProperty("baseUrl")]
        public string BaseUrl { get; set; }

        [JsonProperty("mimeType")]
        public string MimeType { get; set; }

        [JsonProperty("filename")]
        public string Filename { get; set; }
    }

    public class PickedMediaItemsResponse
    {
        [JsonProperty("mediaItems")]
        public List<PickedMediaItem> MediaItems { get; set; }

        [JsonProperty("nextPageToken")]
        public string NextPageToken { get; set; }
    }
}

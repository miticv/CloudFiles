using Newtonsoft.Json;
using System.Collections.Generic;

namespace CloudFiles.Models.Google
{
    public class PickingSession
    {
        [JsonProperty("id")]
        public string Id { get; set; } = default!;

        [JsonProperty("pickerUri")]
        public string PickerUri { get; set; } = default!;

        [JsonProperty("pollingConfig")]
        public PollingConfig PollingConfig { get; set; } = default!;

        [JsonProperty("mediaItemsSet")]
        public bool MediaItemsSet { get; set; }

        [JsonProperty("expireTime")]
        public string ExpireTime { get; set; } = default!;
    }

    public class PollingConfig
    {
        [JsonProperty("pollInterval")]
        public string PollInterval { get; set; } = default!;

        [JsonProperty("timeoutIn")]
        public string TimeoutIn { get; set; } = default!;
    }

    public class PickedMediaItem
    {
        [JsonProperty("id")]
        public string Id { get; set; } = default!;

        [JsonProperty("createTime")]
        public string CreateTime { get; set; } = default!;

        [JsonProperty("type")]
        public string Type { get; set; } = default!;

        [JsonProperty("mediaFile")]
        public MediaFile MediaFile { get; set; } = default!;
    }

    public class MediaFile
    {
        [JsonProperty("baseUrl")]
        public string BaseUrl { get; set; } = default!;

        [JsonProperty("mimeType")]
        public string MimeType { get; set; } = default!;

        [JsonProperty("filename")]
        public string Filename { get; set; } = default!;
    }

    public class PickedMediaItemsResponse
    {
        [JsonProperty("mediaItems")]
        public List<PickedMediaItem> MediaItems { get; set; } = default!;

        [JsonProperty("nextPageToken")]
        public string NextPageToken { get; set; } = default!;
    }
}

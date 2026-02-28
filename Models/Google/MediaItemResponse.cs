using Newtonsoft.Json;
using System.Collections.Generic;

namespace CloudFiles.Models.Google
{
    public class MediaItemSearchResponse
    {
        [JsonProperty("mediaItems")]
        public List<MediaItem> MediaItems { get; set; } = default!;

        [JsonProperty("nextPageToken")]
        public string NextPageToken { get; set; } = default!;
    }

    public class MediaItemSearchRequest
    {
        [JsonProperty("albumId")]
        public string AlbumId { get; set; } = default!;

        [JsonProperty("pageSize")]
        public int PageSize { get; set; }

        [JsonProperty("pageToken")]
        public string PageToken { get; set; } = default!;
    }
}

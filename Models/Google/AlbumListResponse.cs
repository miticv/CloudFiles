using Newtonsoft.Json;
using System.Collections.Generic;

namespace CloudFiles.Models.Google
{
    // Root myDeserializedClass = JsonConvert.DeserializeObject<Root>(myJsonResponse);
    public class Album
    {
        [JsonProperty("id")]
        public string Id { get; set; } = default!;

        [JsonProperty("title")]
        public string Title { get; set; } = default!;

        [JsonProperty("productUrl")]
        public string ProductUrl { get; set; } = default!;

        [JsonProperty("mediaItemsCount")]
        public string MediaItemsCount { get; set; } = default!;

        [JsonProperty("coverPhotoBaseUrl")]
        public string CoverPhotoBaseUrl { get; set; } = default!;

        [JsonProperty("coverPhotoMediaItemId")]
        public string CoverPhotoMediaItemId { get; set; } = default!;
    }

    public class AlbumListResponse
    {
        [JsonProperty("albums")]
        public List<Album> Albums { get; set; } = default!;

        [JsonProperty("nextPageToken")]
        public string NextPageToken { get; set; } = default!;
    }
}

using Newtonsoft.Json;
using System.Collections.Generic;

namespace AdaFile.Models.Google
{
    // Root myDeserializedClass = JsonConvert.DeserializeObject<Root>(myJsonResponse);
    public class Album
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("title")]
        public string Title { get; set; }

        [JsonProperty("productUrl")]
        public string ProductUrl { get; set; }

        [JsonProperty("mediaItemsCount")]
        public string MediaItemsCount { get; set; }

        [JsonProperty("coverPhotoBaseUrl")]
        public string CoverPhotoBaseUrl { get; set; }

        [JsonProperty("coverPhotoMediaItemId")]
        public string CoverPhotoMediaItemId { get; set; }
    }

    public class AlbumListResponse
    {
        [JsonProperty("albums")]
        public List<Album> Albums { get; set; }

        [JsonProperty("nextPageToken")]
        public string NextPageToken { get; set; }
    }
}

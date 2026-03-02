using Newtonsoft.Json;
using System.Collections.Generic;

namespace CloudFiles.Models.Google
{
    // Root myDeserializedClass = JsonConvert.DeserializeObject<NewMediaItemRoot>(myJsonResponse);
    public class SimpleMediaItem
    {
        [JsonProperty("fileName")]
        public string FileName { get; set; } = default!;

        [JsonProperty("uploadToken")]
        public string UploadToken { get; set; } = default!;
    }

    public class NewMediaItem
    {
        [JsonProperty("description")]
        public string Description { get; set; } = default!;

        [JsonProperty("simpleMediaItem")]
        public SimpleMediaItem SimpleMediaItem { get; set; } = default!;
    }

    public class NewMediaItemRoot
    {
        [JsonProperty("albumId")]
        public string AlbumId { get; set; } = default!;

        [JsonProperty("newMediaItems")]
        public List<NewMediaItem> NewMediaItems { get; set; } = default!;
    }
}

using Newtonsoft.Json;
using System.Collections.Generic;

namespace CloudFiles.Models.Google
{
    // Root myDeserializedClass = JsonConvert.DeserializeObject<NewMediaItemRoot>(myJsonResponse);
    public class SimpleMediaItem
    {
        [JsonProperty("fileName")]
        public string FileName { get; set; }

        [JsonProperty("uploadToken")]
        public string UploadToken { get; set; }
    }

    public class NewMediaItem
    {
        [JsonProperty("description")]
        public string Description { get; set; }

        [JsonProperty("simpleMediaItem")]
        public SimpleMediaItem SimpleMediaItem { get; set; }
    }

    public class NewMediaItemRoot
    {
        [JsonProperty("albumId")]
        public string AlbumId { get; set; }

        [JsonProperty("newMediaItems")]
        public List<NewMediaItem> NewMediaItems { get; set; }
    }
}

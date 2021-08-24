using Newtonsoft.Json;

namespace AdaFile.Models.Google
{
    // Root myDeserializedClass = JsonConvert.DeserializeObject<Root>(myJsonResponse);
    public class AlbumCreate
    {
        [JsonProperty("title")]
        public string Title { get; set; }
    }

    public class AlbumCreateRequest
    {
        [JsonProperty("album")]
        public AlbumCreate Album { get; set; }
    }
}

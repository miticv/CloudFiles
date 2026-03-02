using Newtonsoft.Json;

namespace CloudFiles.Models.Google
{
    // Root myDeserializedClass = JsonConvert.DeserializeObject<Root>(myJsonResponse);
    public class AlbumCreate
    {
        [JsonProperty("title")]
        public string Title { get; set; } = default!;
    }

    public class AlbumCreateRequest
    {
        [JsonProperty("album")]
        public AlbumCreate Album { get; set; } = default!;
    }
}

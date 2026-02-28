using Newtonsoft.Json;

namespace CloudFiles.Models.Google
{
    // Root myDeserializedClass = JsonConvert.DeserializeObject<Root>(myJsonResponse);
    public class AlbumCreateResponse
    {
        [JsonProperty("productUrl")]
        public string ProductUrl { get; set; } = default!;

        [JsonProperty("id")]
        public string Id { get; set; } = default!;

        [JsonProperty("title")]
        public string Title { get; set; } = default!;

        [JsonProperty("isWriteable")]
        public string IsWriteable { get; set; } = default!;
    }
}

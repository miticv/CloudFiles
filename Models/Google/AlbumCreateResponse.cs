using Newtonsoft.Json;

namespace CloudFiles.Models.Google
{
    // Root myDeserializedClass = JsonConvert.DeserializeObject<Root>(myJsonResponse);
    public class AlbumCreateResponse
    {
        [JsonProperty("productUrl")]
        public string ProductUrl { get; set; }

        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("title")]
        public string Title { get; set; }

        [JsonProperty("isWriteable")]
        public string IsWriteable { get; set; }
    }
}

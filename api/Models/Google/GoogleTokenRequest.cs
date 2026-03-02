using Newtonsoft.Json;

namespace CloudFiles.Models.Google
{
    public class GoogleTokenRequest
    {
        [JsonProperty("client_id")]
        public string ClientId { get; set; } = default!;

        [JsonProperty("client_secret")]
        public string ClientSecret { get; set; } = default!;

        [JsonProperty("code")]
        public string Code { get; set; } = default!;

        [JsonProperty("redirect_uri")]
        public string RedirectUri { get; set; } = default!;

        [JsonProperty("grant_type")]
        public string GrantType { get; set; } = default!;
    }
}

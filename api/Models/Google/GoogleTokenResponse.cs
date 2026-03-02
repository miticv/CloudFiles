using Newtonsoft.Json;

namespace CloudFiles.Models.Google
{
    public class GoogleTokenResponse
    {
        [JsonProperty("access_token")]
        public string AccessToken { get; set; } = default!;

        [JsonProperty("expires_in")]
        public int ExpiresIn { get; set; }

        [JsonProperty("scope")]
        public string Scope { get; set; } = default!;

        [JsonProperty("token_type")]
        public string TokenType { get; set; } = default!;
    }
}

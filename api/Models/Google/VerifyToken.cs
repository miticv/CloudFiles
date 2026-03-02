
namespace CloudFiles.Models.Google
{
    // Root myDeserializedClass = JsonConvert.DeserializeObject<Root>(myJsonResponse);
    public class VerifyToken
    {
        public string Azp { get; set; } = default!;
        public string Aud { get; set; } = default!;
        public string Scope { get; set; } = default!;
        public string Exp { get; set; } = default!;
        public string ExpiresIn { get; set; } = default!;
        public string AccessType { get; set; } = default!;
        public string Email { get; set; } = default!;
    }
}

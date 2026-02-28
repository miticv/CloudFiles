
namespace CloudFiles.Models.Google
{
    // Root myDeserializedClass = JsonConvert.DeserializeObject<Root>(myJsonResponse);
    public class VerifyToken
    {
        public string Azp { get; set; }
        public string Aud { get; set; }
        public string Scope { get; set; }
        public string Exp { get; set; }
        public string ExpiresIn { get; set; }
        public string AccessType { get; set; }
        public string Email { get; set; }
    }
}

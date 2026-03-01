using Newtonsoft.Json;

namespace CloudFiles.Models
{
    public class LocalLoginRequest
    {
        [JsonProperty("email")]
        public string Email { get; set; } = default!;

        [JsonProperty("password")]
        public string Password { get; set; } = default!;
    }

    public class LocalRegisterRequest
    {
        [JsonProperty("email")]
        public string Email { get; set; } = default!;

        [JsonProperty("displayName")]
        public string DisplayName { get; set; } = default!;

        [JsonProperty("password")]
        public string Password { get; set; } = default!;
    }

    public class OAuthLoginRequest
    {
        [JsonProperty("accessToken")]
        public string AccessToken { get; set; } = default!;

        [JsonProperty("provider")]
        public string Provider { get; set; } = default!;
    }

    public class AuthResponse
    {
        [JsonProperty("token")]
        public string Token { get; set; } = default!;

        [JsonProperty("email")]
        public string Email { get; set; } = default!;

        [JsonProperty("displayName")]
        public string DisplayName { get; set; } = default!;

        [JsonProperty("authProvider")]
        public string AuthProvider { get; set; } = default!;

        [JsonProperty("isAdmin")]
        public bool IsAdmin { get; set; }
    }

    public class UserDto
    {
        [JsonProperty("email")]
        public string Email { get; set; } = default!;

        [JsonProperty("displayName")]
        public string DisplayName { get; set; } = default!;

        [JsonProperty("authProvider")]
        public string AuthProvider { get; set; } = default!;

        [JsonProperty("createdAt")]
        public DateTimeOffset CreatedAt { get; set; }

        [JsonProperty("lastLoginAt")]
        public DateTimeOffset LastLoginAt { get; set; }

        [JsonProperty("isApproved")]
        public bool IsApproved { get; set; }

        [JsonProperty("isActive")]
        public bool IsActive { get; set; }

        [JsonProperty("partitionKey")]
        public string PartitionKey { get; set; } = default!;

        [JsonProperty("rowKey")]
        public string RowKey { get; set; } = default!;
    }
}

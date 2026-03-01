using Azure;
using Azure.Data.Tables;
using Newtonsoft.Json;

namespace CloudFiles.Models
{
    public class UserEntity : ITableEntity
    {
        public string PartitionKey { get; set; } = default!;
        public string RowKey { get; set; } = default!;
        public DateTimeOffset? Timestamp { get; set; }
        public ETag ETag { get; set; }

        [JsonProperty("email")]
        public string Email { get; set; } = default!;

        [JsonProperty("displayName")]
        public string DisplayName { get; set; } = default!;

        [JsonProperty("authProvider")]
        public string AuthProvider { get; set; } = default!;

        [JsonProperty("hashedPassword")]
        public string? HashedPassword { get; set; }

        [JsonProperty("createdAt")]
        public DateTimeOffset CreatedAt { get; set; }

        [JsonProperty("lastLoginAt")]
        public DateTimeOffset LastLoginAt { get; set; }

        [JsonProperty("isApproved")]
        public bool IsApproved { get; set; } = true;

        [JsonProperty("isActive")]
        public bool IsActive { get; set; } = true;
    }
}

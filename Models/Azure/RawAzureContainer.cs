using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;

namespace CloudFiles.Models.Azure
{
    // Root myDeserializedClass = JsonConvert.DeserializeObject<Root>(myJsonResponse);
    public class RawAzureContainerProperties
    {
        [JsonProperty("deleted")]
        public bool Deleted { get; set; }

        [JsonProperty("remainingRetentionDays")]
        public int RemainingRetentionDays { get; set; }

        [JsonProperty("defaultEncryptionScope")]
        public string DefaultEncryptionScope { get; set; } = default!;

        [JsonProperty("denyEncryptionScopeOverride")]
        public bool DenyEncryptionScopeOverride { get; set; }

        [JsonProperty("publicAccess")]
        public string PublicAccess { get; set; } = default!;

        [JsonProperty("leaseStatus")]
        public string LeaseStatus { get; set; } = default!;

        [JsonProperty("leaseState")]
        public string LeaseState { get; set; } = default!;

        [JsonProperty("lastModifiedTime")]
        public DateTime LastModifiedTime { get; set; }

        [JsonProperty("hasImmutabilityPolicy")]
        public bool HasImmutabilityPolicy { get; set; }

        [JsonProperty("hasLegalHold")]
        public bool HasLegalHold { get; set; }

        [JsonProperty("leaseDuration")]
        public string LeaseDuration { get; set; } = default!;
    }

    public class RawAzureContainerValue
    {
        [JsonProperty("id")]
        public string Id { get; set; } = default!;

        [JsonProperty("name")]
        public string Name { get; set; } = default!;

        [JsonProperty("type")]
        public string Type { get; set; } = default!;

        [JsonProperty("etag")]
        public string Etag { get; set; } = default!;

        [JsonProperty("properties")]
        public RawAzureContainerProperties Properties { get; set; } = default!;
    }

    public class RawAzureContainer
    {
        [JsonProperty("value")]
        public List<RawAzureContainerValue> Value { get; set; } = default!;
    }
}

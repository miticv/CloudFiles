using Newtonsoft.Json;
using System;
using System.Collections.Generic;

namespace CloudFiles.Models.Azure
{
    // Root myDeserializedClass = JsonConvert.DeserializeObject<RawAzureBlobContainers>(myJsonResponse);
    public class Sku
    {
        [JsonProperty("name")]
        public string Name { get; set; } = default!;

        [JsonProperty("tier")]
        public string Tier { get; set; } = default!;
    }

    public class Tags
    {
        [JsonProperty("hidden-related:/providers/Microsoft.Web/sites/AzureGalleryFunctions")]
        public string HiddenRelatedProvidersMicrosoftWebSitesAzureGalleryFunctions { get; set; } = default!;
    }

    public class KeyCreationTime
    {
        [JsonProperty("key1")]
        public object Key1 { get; set; } = default!;

        [JsonProperty("key2")]
        public object Key2 { get; set; } = default!;
    }

    public class AzureFilesIdentityBasedAuthentication
    {
        [JsonProperty("directoryServiceOptions")]
        public string DirectoryServiceOptions { get; set; } = default!;
    }

    public class NetworkAcls
    {
        [JsonProperty("bypass")]
        public string Bypass { get; set; } = default!;

        [JsonProperty("virtualNetworkRules")]
        public List<object> VirtualNetworkRules { get; set; } = default!;

        [JsonProperty("ipRules")]
        public List<object> IpRules { get; set; } = default!;

        [JsonProperty("defaultAction")]
        public string DefaultAction { get; set; } = default!;
    }

    public class File
    {
        [JsonProperty("keyType")]
        public string KeyType { get; set; } = default!;

        [JsonProperty("enabled")]
        public bool Enabled { get; set; }

        [JsonProperty("lastEnabledTime")]
        public DateTime LastEnabledTime { get; set; }
    }

    public class Blob
    {
        [JsonProperty("keyType")]
        public string KeyType { get; set; } = default!;

        [JsonProperty("enabled")]
        public bool Enabled { get; set; }

        [JsonProperty("lastEnabledTime")]
        public DateTime LastEnabledTime { get; set; }
    }

    public class Services
    {
        [JsonProperty("file")]
        public File File { get; set; } = default!;

        [JsonProperty("blob")]
        public Blob Blob { get; set; } = default!;
    }

    public class Encryption
    {
        [JsonProperty("services")]
        public Services Services { get; set; } = default!;

        [JsonProperty("keySource")]
        public string KeySource { get; set; } = default!;
    }

    public class PrimaryEndpoints
    {
        [JsonProperty("dfs")]
        public string Dfs { get; set; } = default!;

        [JsonProperty("web")]
        public string Web { get; set; } = default!;

        [JsonProperty("blob")]
        public string Blob { get; set; } = default!;

        [JsonProperty("queue")]
        public string Queue { get; set; } = default!;

        [JsonProperty("table")]
        public string Table { get; set; } = default!;

        [JsonProperty("file")]
        public string File { get; set; } = default!;
    }

    public class SecondaryEndpoints
    {
        [JsonProperty("dfs")]
        public string Dfs { get; set; } = default!;

        [JsonProperty("web")]
        public string Web { get; set; } = default!;

        [JsonProperty("blob")]
        public string Blob { get; set; } = default!;

        [JsonProperty("queue")]
        public string Queue { get; set; } = default!;

        [JsonProperty("table")]
        public string Table { get; set; } = default!;
    }

    public class AzureBlobContainerProperties
    {
        [JsonProperty("keyCreationTime")]
        public KeyCreationTime KeyCreationTime { get; set; } = default!;

        [JsonProperty("privateEndpointConnections")]
        public List<object> PrivateEndpointConnections { get; set; } = default!;

        [JsonProperty("azureFilesIdentityBasedAuthentication")]
        public AzureFilesIdentityBasedAuthentication AzureFilesIdentityBasedAuthentication { get; set; } = default!;

        [JsonProperty("minimumTlsVersion")]
        public string MinimumTlsVersion { get; set; } = default!;

        [JsonProperty("allowBlobPublicAccess")]
        public bool AllowBlobPublicAccess { get; set; }

        [JsonProperty("networkAcls")]
        public NetworkAcls NetworkAcls { get; set; } = default!;

        [JsonProperty("supportsHttpsTrafficOnly")]
        public bool SupportsHttpsTrafficOnly { get; set; }

        [JsonProperty("encryption")]
        public Encryption Encryption { get; set; } = default!;

        [JsonProperty("accessTier")]
        public string AccessTier { get; set; } = default!;

        [JsonProperty("provisioningState")]
        public string ProvisioningState { get; set; } = default!;

        [JsonProperty("creationTime")]
        public DateTime CreationTime { get; set; }

        [JsonProperty("primaryEndpoints")]
        public PrimaryEndpoints PrimaryEndpoints { get; set; } = default!;

        [JsonProperty("primaryLocation")]
        public string PrimaryLocation { get; set; } = default!;

        [JsonProperty("statusOfPrimary")]
        public string StatusOfPrimary { get; set; } = default!;

        [JsonProperty("secondaryLocation")]
        public string SecondaryLocation { get; set; } = default!;

        [JsonProperty("statusOfSecondary")]
        public string StatusOfSecondary { get; set; } = default!;

        [JsonProperty("secondaryEndpoints")]
        public SecondaryEndpoints SecondaryEndpoints { get; set; } = default!;
    }

    public class AzureBlobContainerValue
    {
        [JsonProperty("sku")]
        public Sku Sku { get; set; } = default!;

        [JsonProperty("kind")]
        public string Kind { get; set; } = default!;

        [JsonProperty("id")]
        public string Id { get; set; } = default!;

        [JsonProperty("name")]
        public string Name { get; set; } = default!;

        [JsonProperty("type")]
        public string Type { get; set; } = default!;

        [JsonProperty("location")]
        public string Location { get; set; } = default!;

        [JsonProperty("tags")]
        public Tags Tags { get; set; } = default!;

        [JsonProperty("properties")]
        public AzureBlobContainerProperties Properties { get; set; } = default!;
    }

    public class RawAzureBlobContainers
    {
        [JsonProperty("value")]
        public List<AzureBlobContainerValue> Value { get; set; } = default!;
    }
}

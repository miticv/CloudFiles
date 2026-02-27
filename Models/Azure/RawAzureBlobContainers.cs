using Newtonsoft.Json;
using System;
using System.Collections.Generic;

namespace CloudFiles.Models.Azure
{
    // Root myDeserializedClass = JsonConvert.DeserializeObject<RawAzureBlobContainers>(myJsonResponse);
    public class Sku
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("tier")]
        public string Tier { get; set; }
    }

    public class Tags
    {
        [JsonProperty("hidden-related:/providers/Microsoft.Web/sites/AzureGalleryFunctions")]
        public string HiddenRelatedProvidersMicrosoftWebSitesAzureGalleryFunctions { get; set; }
    }

    public class KeyCreationTime
    {
        [JsonProperty("key1")]
        public object Key1 { get; set; }

        [JsonProperty("key2")]
        public object Key2 { get; set; }
    }

    public class AzureFilesIdentityBasedAuthentication
    {
        [JsonProperty("directoryServiceOptions")]
        public string DirectoryServiceOptions { get; set; }
    }

    public class NetworkAcls
    {
        [JsonProperty("bypass")]
        public string Bypass { get; set; }

        [JsonProperty("virtualNetworkRules")]
        public List<object> VirtualNetworkRules { get; set; }

        [JsonProperty("ipRules")]
        public List<object> IpRules { get; set; }

        [JsonProperty("defaultAction")]
        public string DefaultAction { get; set; }
    }

    public class File
    {
        [JsonProperty("keyType")]
        public string KeyType { get; set; }

        [JsonProperty("enabled")]
        public bool Enabled { get; set; }

        [JsonProperty("lastEnabledTime")]
        public DateTime LastEnabledTime { get; set; }
    }

    public class Blob
    {
        [JsonProperty("keyType")]
        public string KeyType { get; set; }

        [JsonProperty("enabled")]
        public bool Enabled { get; set; }

        [JsonProperty("lastEnabledTime")]
        public DateTime LastEnabledTime { get; set; }
    }

    public class Services
    {
        [JsonProperty("file")]
        public File File { get; set; }

        [JsonProperty("blob")]
        public Blob Blob { get; set; }
    }

    public class Encryption
    {
        [JsonProperty("services")]
        public Services Services { get; set; }

        [JsonProperty("keySource")]
        public string KeySource { get; set; }
    }

    public class PrimaryEndpoints
    {
        [JsonProperty("dfs")]
        public string Dfs { get; set; }

        [JsonProperty("web")]
        public string Web { get; set; }

        [JsonProperty("blob")]
        public string Blob { get; set; }

        [JsonProperty("queue")]
        public string Queue { get; set; }

        [JsonProperty("table")]
        public string Table { get; set; }

        [JsonProperty("file")]
        public string File { get; set; }
    }

    public class SecondaryEndpoints
    {
        [JsonProperty("dfs")]
        public string Dfs { get; set; }

        [JsonProperty("web")]
        public string Web { get; set; }

        [JsonProperty("blob")]
        public string Blob { get; set; }

        [JsonProperty("queue")]
        public string Queue { get; set; }

        [JsonProperty("table")]
        public string Table { get; set; }
    }

    public class AzureBlobContainerProperties
    {
        [JsonProperty("keyCreationTime")]
        public KeyCreationTime KeyCreationTime { get; set; }

        [JsonProperty("privateEndpointConnections")]
        public List<object> PrivateEndpointConnections { get; set; }

        [JsonProperty("azureFilesIdentityBasedAuthentication")]
        public AzureFilesIdentityBasedAuthentication AzureFilesIdentityBasedAuthentication { get; set; }

        [JsonProperty("minimumTlsVersion")]
        public string MinimumTlsVersion { get; set; }

        [JsonProperty("allowBlobPublicAccess")]
        public bool AllowBlobPublicAccess { get; set; }

        [JsonProperty("networkAcls")]
        public NetworkAcls NetworkAcls { get; set; }

        [JsonProperty("supportsHttpsTrafficOnly")]
        public bool SupportsHttpsTrafficOnly { get; set; }

        [JsonProperty("encryption")]
        public Encryption Encryption { get; set; }

        [JsonProperty("accessTier")]
        public string AccessTier { get; set; }

        [JsonProperty("provisioningState")]
        public string ProvisioningState { get; set; }

        [JsonProperty("creationTime")]
        public DateTime CreationTime { get; set; }

        [JsonProperty("primaryEndpoints")]
        public PrimaryEndpoints PrimaryEndpoints { get; set; }

        [JsonProperty("primaryLocation")]
        public string PrimaryLocation { get; set; }

        [JsonProperty("statusOfPrimary")]
        public string StatusOfPrimary { get; set; }

        [JsonProperty("secondaryLocation")]
        public string SecondaryLocation { get; set; }

        [JsonProperty("statusOfSecondary")]
        public string StatusOfSecondary { get; set; }

        [JsonProperty("secondaryEndpoints")]
        public SecondaryEndpoints SecondaryEndpoints { get; set; }
    }

    public class AzureBlobContainerValue
    {
        [JsonProperty("sku")]
        public Sku Sku { get; set; }

        [JsonProperty("kind")]
        public string Kind { get; set; }

        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("type")]
        public string Type { get; set; }

        [JsonProperty("location")]
        public string Location { get; set; }

        [JsonProperty("tags")]
        public Tags Tags { get; set; }

        [JsonProperty("properties")]
        public AzureBlobContainerProperties Properties { get; set; }
    }

    public class RawAzureBlobContainers
    {
        [JsonProperty("value")]
        public List<AzureBlobContainerValue> Value { get; set; }
    }
}

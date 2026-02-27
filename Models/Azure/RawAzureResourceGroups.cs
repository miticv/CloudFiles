using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;

namespace CloudFiles.Models.Azure
{
    // Root myDeserializedClass = JsonConvert.DeserializeObject<RawResourceGroups>(myJsonResponse);
    public class ResourceGroupsProperties
    {
        [JsonProperty("provisioningState")]
        public string ProvisioningState { get; set; }
    }

    public class ResourceGroupsValue
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("type")]
        public string Type { get; set; }

        [JsonProperty("location")]
        public string Location { get; set; }

        [JsonProperty("properties")]
        public ResourceGroupsProperties Properties { get; set; }
    }

    public class RawAzureResourceGroups
    {
        [JsonProperty("value")]
        public List<ResourceGroupsValue> Value { get; set; }
    }
}

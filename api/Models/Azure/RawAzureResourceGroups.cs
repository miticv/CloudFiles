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
        public string ProvisioningState { get; set; } = default!;
    }

    public class ResourceGroupsValue
    {
        [JsonProperty("id")]
        public string Id { get; set; } = default!;

        [JsonProperty("name")]
        public string Name { get; set; } = default!;

        [JsonProperty("type")]
        public string Type { get; set; } = default!;

        [JsonProperty("location")]
        public string Location { get; set; } = default!;

        [JsonProperty("properties")]
        public ResourceGroupsProperties Properties { get; set; } = default!;
    }

    public class RawAzureResourceGroups
    {
        [JsonProperty("value")]
        public List<ResourceGroupsValue> Value { get; set; } = default!;
    }
}

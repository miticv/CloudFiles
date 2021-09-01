using Newtonsoft.Json;

namespace CloudFiles.Models
{
    // StartJobResponse myDeserializedClass = JsonConvert.DeserializeObject<StartJobResponse>(myJsonResponse);
    public class StartJobResponse
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("statusQueryGetUri")]
        public string StatusQueryGetUri { get; set; }

        [JsonProperty("sendEventPostUri")]
        public string SendEventPostUri { get; set; }

        [JsonProperty("terminatePostUri")]
        public string TerminatePostUri { get; set; }

        [JsonProperty("purgeHistoryDeleteUri")]
        public string PurgeHistoryDeleteUri { get; set; }

        [JsonProperty("restartPostUri")]
        public string RestartPostUri { get; set; }
    }
}

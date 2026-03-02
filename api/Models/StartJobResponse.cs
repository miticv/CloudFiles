using Newtonsoft.Json;

namespace CloudFiles.Models
{
    // StartJobResponse myDeserializedClass = JsonConvert.DeserializeObject<StartJobResponse>(myJsonResponse);
    public class StartJobResponse
    {
        [JsonProperty("id")]
        public string Id { get; set; } = default!;

        [JsonProperty("statusQueryGetUri")]
        public string StatusQueryGetUri { get; set; } = default!;

        [JsonProperty("sendEventPostUri")]
        public string SendEventPostUri { get; set; } = default!;

        [JsonProperty("terminatePostUri")]
        public string TerminatePostUri { get; set; } = default!;

        [JsonProperty("purgeHistoryDeleteUri")]
        public string PurgeHistoryDeleteUri { get; set; } = default!;

        [JsonProperty("restartPostUri")]
        public string RestartPostUri { get; set; } = default!;
    }
}

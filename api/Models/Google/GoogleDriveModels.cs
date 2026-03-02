using Newtonsoft.Json;
using System.Collections.Generic;

namespace CloudFiles.Models.Google
{
    public class GoogleDriveFileListResponse
    {
        [JsonProperty("nextPageToken")]
        public string NextPageToken { get; set; }

        [JsonProperty("files")]
        public List<GoogleDriveFile> Files { get; set; } = new();
    }

    public class GoogleDriveFile
    {
        [JsonProperty("id")]
        public string Id { get; set; } = default!;

        [JsonProperty("name")]
        public string Name { get; set; } = default!;

        [JsonProperty("mimeType")]
        public string MimeType { get; set; } = default!;

        [JsonProperty("size")]
        public long? Size { get; set; }

        [JsonProperty("modifiedTime")]
        public string ModifiedTime { get; set; }

        [JsonProperty("iconLink")]
        public string IconLink { get; set; }

        public bool IsFolder => MimeType == "application/vnd.google-apps.folder";
    }
}

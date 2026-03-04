using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class PCloudToDriveRequest
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public string DestinationFolderId { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<PCloudFileItem> Items { get; set; } = default!;
    }

    public class PCloudToDriveItemPrepared
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public long FileId { get; set; }
        public string Filename { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public string DestinationFolderId { get; set; } = default!;
    }

    public class PCloudToDriveItemsPrepared
    {
        public List<PCloudToDriveItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

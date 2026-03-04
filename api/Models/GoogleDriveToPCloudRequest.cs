using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class GoogleDriveToPCloudRequest
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public long DestinationFolderId { get; set; }
        public string StartedBy { get; set; } = default!;
        public List<DriveFileItem> DriveItems { get; set; } = default!;
    }

    public class GoogleDriveToPCloudItemPrepared
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public string DriveFileId { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string MimeType { get; set; } = default!;
        public long DestinationFolderId { get; set; }
    }

    public class GoogleDriveToPCloudItemsPrepared
    {
        public List<GoogleDriveToPCloudItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

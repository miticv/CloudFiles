using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class GoogleDriveToGcsRequest
    {
        public string AccessToken { get; set; } = default!;
        public string BucketName { get; set; } = default!;
        public string DestinationFolder { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<DriveFileItem> DriveItems { get; set; } = default!;
    }

    public class DriveToGcsItemPrepared
    {
        public string GoogleAccessToken { get; set; } = default!;
        public string DriveFileId { get; set; } = default!;
        public string MimeType { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string BucketName { get; set; } = default!;
        public string DestinationObjectName { get; set; } = default!;
    }

    public class DriveToGcsItemsPrepared
    {
        public List<DriveToGcsItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class GoogleDriveToDropboxRequest
    {
        public string AccessToken { get; set; } = default!;
        public string DropboxAccessToken { get; set; } = default!;
        public string DestinationFolder { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<DriveFileItem> DriveItems { get; set; } = default!;
    }

    public class DriveToDropboxItemPrepared
    {
        public string GoogleAccessToken { get; set; } = default!;
        public string DriveFileId { get; set; } = default!;
        public string MimeType { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string DropboxAccessToken { get; set; } = default!;
        public string DestinationPath { get; set; } = default!;
    }

    public class DriveToDropboxItemsPrepared
    {
        public List<DriveToDropboxItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

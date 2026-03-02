using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class DropboxToDriveRequest
    {
        public string DropboxAccessToken { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public string DestinationFolderId { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<DropboxFileItem> Items { get; set; } = default!;
    }

    public class DropboxToDriveItemPrepared
    {
        public string DropboxAccessToken { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public string DropboxPath { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string DestinationFolderId { get; set; } = default!;
    }

    public class DropboxToDriveItemsPrepared
    {
        public List<DropboxToDriveItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

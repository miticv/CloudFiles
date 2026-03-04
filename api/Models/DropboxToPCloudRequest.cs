using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class DropboxToPCloudRequest
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public string DropboxAccessToken { get; set; } = default!;
        public long DestinationFolderId { get; set; }
        public string StartedBy { get; set; } = default!;
        public List<DropboxFileItem> Items { get; set; } = default!;
    }

    public class DropboxToPCloudItemPrepared
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public string DropboxAccessToken { get; set; } = default!;
        public string DropboxPath { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public long DestinationFolderId { get; set; }
    }

    public class DropboxToPCloudItemsPrepared
    {
        public List<DropboxToPCloudItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

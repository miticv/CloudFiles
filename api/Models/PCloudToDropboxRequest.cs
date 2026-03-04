using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class PCloudToDropboxRequest
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public string DropboxAccessToken { get; set; } = default!;
        public string DestinationFolder { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<PCloudFileItem> Items { get; set; } = default!;
    }

    public class PCloudToDropboxItemPrepared
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public long FileId { get; set; }
        public string Filename { get; set; } = default!;
        public string DropboxAccessToken { get; set; } = default!;
        public string DestinationPath { get; set; } = default!;
    }

    public class PCloudToDropboxItemsPrepared
    {
        public List<PCloudToDropboxItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

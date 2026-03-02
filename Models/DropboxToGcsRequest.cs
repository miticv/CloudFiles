using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class DropboxToGcsRequest
    {
        public string DropboxAccessToken { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public string BucketName { get; set; } = default!;
        public string DestinationFolder { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<DropboxFileItem> Items { get; set; } = default!;
    }

    public class DropboxToGcsItemPrepared
    {
        public string DropboxAccessToken { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public string DropboxPath { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string BucketName { get; set; } = default!;
        public string DestinationObjectName { get; set; } = default!;
    }

    public class DropboxToGcsItemsPrepared
    {
        public List<DropboxToGcsItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

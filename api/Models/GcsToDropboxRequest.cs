using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class GcsToDropboxRequest
    {
        public string AccessToken { get; set; } = default!;
        public string DropboxAccessToken { get; set; } = default!;
        public string BucketName { get; set; } = default!;
        public string DestinationFolder { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<GcsSelectedItem> SelectedItems { get; set; } = default!;
    }

    public class GcsToDropboxItemPrepared
    {
        public string GoogleAccessToken { get; set; } = default!;
        public string DropboxAccessToken { get; set; } = default!;
        public string MediaLink { get; set; } = default!;
        public string ContentType { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string DestinationPath { get; set; } = default!;
    }

    public class GcsToDropboxItemsPrepared
    {
        public List<GcsToDropboxItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

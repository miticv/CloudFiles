using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class GcsToDriveRequest
    {
        public string AccessToken { get; set; } = default!;
        public string BucketName { get; set; } = default!;
        public string DestinationFolderId { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<GcsSelectedItem> SelectedItems { get; set; } = default!;
    }

    public class GcsToDriveItemPrepared
    {
        public string GoogleAccessToken { get; set; } = default!;
        public string MediaLink { get; set; } = default!;
        public string ContentType { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string DestinationFolderId { get; set; } = default!;
    }

    public class GcsToDriveItemsPrepared
    {
        public List<GcsToDriveItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

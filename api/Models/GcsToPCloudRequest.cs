using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class GcsToPCloudRequest
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public string BucketName { get; set; } = default!;
        public long DestinationFolderId { get; set; }
        public string StartedBy { get; set; } = default!;
        public List<GcsSelectedItem> SelectedItems { get; set; } = default!;
    }

    public class GcsToPCloudItemPrepared
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public string BucketName { get; set; } = default!;
        public string ObjectName { get; set; } = default!;
        public long DestinationFolderId { get; set; }
        public string Filename { get; set; } = default!;
    }

    public class GcsToPCloudItemsPrepared
    {
        public List<GcsToPCloudItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

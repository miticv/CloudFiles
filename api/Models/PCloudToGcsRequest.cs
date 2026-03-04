using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class PCloudToGcsRequest
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public string BucketName { get; set; } = default!;
        public string DestinationFolder { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<PCloudFileItem> Items { get; set; } = default!;
    }

    public class PCloudToGcsItemPrepared
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public long FileId { get; set; }
        public string Filename { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public string BucketName { get; set; } = default!;
        public string DestinationPath { get; set; } = default!;
    }

    public class PCloudToGcsItemsPrepared
    {
        public List<PCloudToGcsItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class GooglePhotosToPCloudRequest
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public long DestinationFolderId { get; set; }
        public string StartedBy { get; set; } = default!;
        public List<PhotoCopyItem> PhotoItems { get; set; } = default!;
    }

    public class PhotoCopyItem
    {
        public string BaseUrl { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string MediaType { get; set; } = default!;
    }

    public class GooglePhotosToPCloudItemPrepared
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public string BaseUrl { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string MediaType { get; set; } = default!;
        public long DestinationFolderId { get; set; }
    }

    public class GooglePhotosToPCloudItemsPrepared
    {
        public List<GooglePhotosToPCloudItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class GooglePhotosToGcsRequest
    {
        public string AccessToken { get; set; } = default!;
        public string BucketName { get; set; } = default!;
        public string DestinationFolder { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<PickedPhotoItem> PhotoItems { get; set; } = default!;
    }

    public class PhotoToGcsItemPrepared
    {
        public string GoogleAccessToken { get; set; } = default!;
        public string BaseUrl { get; set; } = default!;
        public string MimeType { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string BucketName { get; set; } = default!;
        public string DestinationObjectName { get; set; } = default!;
    }

    public class PhotoToGcsItemsPrepared
    {
        public List<PhotoToGcsItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

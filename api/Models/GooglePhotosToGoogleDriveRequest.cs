using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class GooglePhotosToGoogleDriveRequest
    {
        public string AccessToken { get; set; } = default!;
        public string DestinationFolderId { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<PickedPhotoItem> PhotoItems { get; set; } = default!;
    }

    public class PhotoToDriveItemPrepared
    {
        public string GoogleAccessToken { get; set; } = default!;
        public string BaseUrl { get; set; } = default!;
        public string MimeType { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string DestinationFolderId { get; set; } = default!;
    }

    public class PhotoToDriveItemsPrepared
    {
        public List<PhotoToDriveItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

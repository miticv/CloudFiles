using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class GooglePhotosToDropboxRequest
    {
        public string AccessToken { get; set; } = default!;
        public string DropboxAccessToken { get; set; } = default!;
        public string DestinationFolder { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<PickedPhotoItem> PhotoItems { get; set; } = default!;
    }

    public class PhotoToDropboxItemPrepared
    {
        public string GoogleAccessToken { get; set; } = default!;
        public string BaseUrl { get; set; } = default!;
        public string MimeType { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string DropboxAccessToken { get; set; } = default!;
        public string DestinationPath { get; set; } = default!;
    }

    public class PhotoToDropboxItemsPrepared
    {
        public List<PhotoToDropboxItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

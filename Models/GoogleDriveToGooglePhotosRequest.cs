using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class GoogleDriveToGooglePhotosRequest
    {
        public string AccessToken { get; set; } = default!;
        public string AlbumId { get; set; } = default!;
        public string AlbumTitle { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<DriveFileItem> DriveItems { get; set; } = default!;
    }

    public class DriveToGooglePhotosItemPrepared
    {
        public string GoogleAccessToken { get; set; } = default!;
        public string DriveFileId { get; set; } = default!;
        public string AlbumId { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string ContentType { get; set; } = default!;
        public string UploadToken { get; set; } = default!;
        public string StatusMessage { get; set; } = default!;
    }

    public class DriveToGooglePhotosItemsPrepared
    {
        public List<DriveToGooglePhotosItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

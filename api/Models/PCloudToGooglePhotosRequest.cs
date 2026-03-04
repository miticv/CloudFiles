using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class PCloudToGooglePhotosRequest
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public string AlbumId { get; set; } = default!;
        public string AlbumTitle { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<PCloudFileItem> Items { get; set; } = default!;
    }

    public class PCloudToGooglePhotosItemPrepared
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public long FileId { get; set; }
        public string Filename { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public string AlbumId { get; set; } = default!;
        public string AlbumTitle { get; set; } = default!;
        public string ContentType { get; set; } = default!;
        public string UploadToken { get; set; } = default!;
        public string StatusMessage { get; set; } = default!;
    }

    public class PCloudToGooglePhotosItemsPrepared
    {
        public List<PCloudToGooglePhotosItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

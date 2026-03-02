using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class DropboxToGooglePhotosRequest
    {
        public string DropboxAccessToken { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public string AlbumId { get; set; } = default!;
        public string AlbumTitle { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<DropboxFileItem> Items { get; set; } = default!;
    }

    public class DropboxToGooglePhotosItemPrepared
    {
        public string DropboxAccessToken { get; set; } = default!;
        public string GoogleAccessToken { get; set; } = default!;
        public string AlbumId { get; set; } = default!;
        public string DropboxPath { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string ContentType { get; set; } = default!;
        public string UploadToken { get; set; } = default!;
        public string StatusMessage { get; set; } = default!;
    }

    public class DropboxToGooglePhotosItemsPrepared
    {
        public List<DropboxToGooglePhotosItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

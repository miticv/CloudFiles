using System.Collections.Generic;

namespace CloudFiles.Models.Google
{
    public class BatchCreateRequest
    {
        public string AccessToken { get; set; } = default!;
        public string AlbumId { get; set; } = default!;
        public List<BatchCreateItem> Items { get; set; } = new();
    }

    public class BatchCreateItem
    {
        public string UploadToken { get; set; } = default!;
        public string FileName { get; set; } = default!;
    }
}

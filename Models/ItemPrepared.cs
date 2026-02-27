namespace CloudFiles.Models
{
    public class ItemPrepared
    {
        public ItemPrepared() { }

        public ItemPrepared(Item item, string accessToken, string albumId)
        {
            ItemPath = item.ItemPath;
            ItemFilename = GetFilename(item.ItemPath);
            AccessToken = accessToken;
            AlbumId = albumId;
        }

        private string GetFilename(string path) {
            if (!path.Contains("/")) return path;
            return path[(path.LastIndexOf("/")+1)..];
        }

        public string ItemId { get; set; }
        public string ItemPath { get; set; }
        public string ItemFilename { get; set; }
        public string AccessToken { get; set; }
        public string ContentType { get; set; }
        public long ContentLength { get; set; }

        public string AlbumId { get; set; }
        public string UploadToken { get; set; }
        public string StatusMessage { get; set; }
    }
}

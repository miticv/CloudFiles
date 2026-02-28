namespace CloudFiles.Models
{
    public class ItemPrepared
    {
        public ItemPrepared() { }

        public ItemPrepared(Item item, string accessToken, string albumId,
            string? accountName = null, string? containerName = null, string? azureAccessToken = null)
        {
            ItemPath = item.ItemPath;
            ItemFilename = GetFilename(item.ItemPath);
            AccessToken = accessToken;
            AlbumId = albumId;
            AccountName = accountName;
            ContainerName = containerName;
            AzureAccessToken = azureAccessToken;
        }

        private string GetFilename(string path) {
            if (!path.Contains("/")) return path;
            return path[(path.LastIndexOf("/")+1)..];
        }

        public string ItemId { get; set; } = default!;
        public string ItemPath { get; set; } = default!;
        public string ItemFilename { get; set; } = default!;
        public string AccessToken { get; set; } = default!;
        public string ContentType { get; set; } = default!;
        public long ContentLength { get; set; }

        public string AlbumId { get; set; } = default!;
        public string UploadToken { get; set; } = default!;
        public string StatusMessage { get; set; } = default!;
        public string? AccountName { get; set; }
        public string? ContainerName { get; set; }
        public string? AzureAccessToken { get; set; }
    }
}

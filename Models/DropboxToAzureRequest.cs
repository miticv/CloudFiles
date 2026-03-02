using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class DropboxToAzureRequest
    {
        public string DropboxAccessToken { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string DestinationFolder { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<DropboxFileItem> Items { get; set; } = default!;
    }

    public class DropboxFileItem
    {
        public string Path { get; set; } = default!;
        public string Name { get; set; } = default!;
        public long Size { get; set; }
    }

    public class DropboxToAzureItemPrepared
    {
        public string DropboxAccessToken { get; set; } = default!;
        public string DropboxPath { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string DestinationPath { get; set; } = default!;
    }

    public class DropboxToAzureItemsPrepared
    {
        public List<DropboxToAzureItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

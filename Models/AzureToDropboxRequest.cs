using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class AzureToDropboxRequest
    {
        public string DropboxAccessToken { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string DestinationFolder { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<AzureSelectedItem> SelectedItems { get; set; } = default!;
    }

    public class AzureToDropboxItemPrepared
    {
        public string DropboxAccessToken { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string BlobPath { get; set; } = default!;
        public string DestinationPath { get; set; } = default!;
        public string Filename { get; set; } = default!;
    }

    public class AzureToDropboxItemsPrepared
    {
        public List<AzureToDropboxItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

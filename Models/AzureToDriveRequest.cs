using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class AzureToDriveRequest
    {
        public string AccessToken { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string DestinationFolderId { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<AzureSelectedItem> SelectedItems { get; set; } = default!;
    }

    public class AzureToDriveItemPrepared
    {
        public string GoogleAccessToken { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string BlobPath { get; set; } = default!;
        public string DestinationFolderId { get; set; } = default!;
        public string Filename { get; set; } = default!;
    }

    public class AzureToDriveItemsPrepared
    {
        public List<AzureToDriveItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

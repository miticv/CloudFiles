using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class AzureToPCloudRequest
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public long DestinationFolderId { get; set; }
        public string StartedBy { get; set; } = default!;
        public List<AzureSelectedItem> SelectedItems { get; set; } = default!;
    }

    public class AzureToPCloudItemPrepared
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string BlobPath { get; set; } = default!;
        public long DestinationFolderId { get; set; }
        public string Filename { get; set; } = default!;
    }

    public class AzureToPCloudItemsPrepared
    {
        public List<AzureToPCloudItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

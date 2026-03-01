using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class AzureToGcsRequest
    {
        public string AccessToken { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string BucketName { get; set; } = default!;
        public string DestinationFolder { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<AzureSelectedItem> SelectedItems { get; set; } = default!;
    }

    public class AzureSelectedItem
    {
        public string ItemPath { get; set; } = default!;
        public bool IsFolder { get; set; }
    }

    public class AzureToGcsItemPrepared
    {
        public string GoogleAccessToken { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string BlobPath { get; set; } = default!;
        public string BucketName { get; set; } = default!;
        public string DestinationObjectName { get; set; } = default!;
        public string ContentType { get; set; } = default!;
        public string Filename { get; set; } = default!;
    }

    public class AzureToGcsItemsPrepared
    {
        public List<AzureToGcsItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

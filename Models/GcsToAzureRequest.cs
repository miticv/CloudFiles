using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class GcsToAzureRequest
    {
        public string AccessToken { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string BucketName { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string DestinationFolder { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<GcsSelectedItem> SelectedItems { get; set; } = default!;
    }

    public class GcsSelectedItem
    {
        public string ItemPath { get; set; } = default!;
        public bool IsFolder { get; set; }
    }

    public class GcsToAzureItemPrepared
    {
        public string GoogleAccessToken { get; set; } = default!;
        public string MediaLink { get; set; } = default!;
        public string ContentType { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string DestinationPath { get; set; } = default!;
    }

    public class GcsToAzureItemsPrepared
    {
        public List<GcsToAzureItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

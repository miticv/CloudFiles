using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class PCloudToAzureRequest
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string DestinationFolder { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<PCloudFileItem> Items { get; set; } = default!;
    }

    public class PCloudFileItem
    {
        public long FileId { get; set; }
        public string Name { get; set; } = default!;
        public long Size { get; set; }
    }

    public class PCloudToAzureItemPrepared
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public long FileId { get; set; }
        public string Filename { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string DestinationPath { get; set; } = default!;
    }

    public class PCloudToAzureItemsPrepared
    {
        public List<PCloudToAzureItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

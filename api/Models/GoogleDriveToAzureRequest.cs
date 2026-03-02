using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class GoogleDriveToAzureRequest
    {
        public string AccessToken { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string DestinationFolder { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<DriveFileItem> DriveItems { get; set; } = default!;
    }

    public class DriveFileItem
    {
        public string Id { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string MimeType { get; set; } = default!;
        public long? Size { get; set; }
    }

    public class DriveToAzureItemPrepared
    {
        public string GoogleAccessToken { get; set; } = default!;
        public string DriveFileId { get; set; } = default!;
        public string MimeType { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string DestinationPath { get; set; } = default!;
    }

    public class DriveToAzureItemsPrepared
    {
        public List<DriveToAzureItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

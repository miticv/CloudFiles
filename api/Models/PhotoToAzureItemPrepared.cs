using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class PhotoToAzureItemPrepared
    {
        public string GoogleAccessToken { get; set; } = default!;
        public string BaseUrl { get; set; } = default!;
        public string MimeType { get; set; } = default!;
        public string Filename { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string DestinationPath { get; set; } = default!;
    }

    public class PhotoToAzureItemsPrepared
    {
        public List<PhotoToAzureItemPrepared> ListItemsPrepared { get; set; } = default!;
    }
}

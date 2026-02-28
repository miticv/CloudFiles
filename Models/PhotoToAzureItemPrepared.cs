using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class PhotoToAzureItemPrepared
    {
        public string GoogleAccessToken { get; set; }
        public string BaseUrl { get; set; }
        public string MimeType { get; set; }
        public string Filename { get; set; }
        public string AccountName { get; set; }
        public string ContainerName { get; set; }
        public string AzureAccessToken { get; set; }
        public string DestinationPath { get; set; }
    }

    public class PhotoToAzureItemsPrepared
    {
        public List<PhotoToAzureItemPrepared> ListItemsPrepared { get; set; }
    }
}

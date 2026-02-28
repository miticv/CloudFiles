using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class GooglePhotosToAzureRequest
    {
        public string AccessToken { get; set; }
        public string AzureAccessToken { get; set; }
        public string AccountName { get; set; }
        public string ContainerName { get; set; }
        public string DestinationFolder { get; set; }
        public string StartedBy { get; set; }
        public List<PickedPhotoItem> PhotoItems { get; set; }
    }

    public class PickedPhotoItem
    {
        public string Id { get; set; }
        public string BaseUrl { get; set; }
        public string MimeType { get; set; }
        public string Filename { get; set; }
    }
}

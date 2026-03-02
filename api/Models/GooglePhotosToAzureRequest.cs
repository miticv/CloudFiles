using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class GooglePhotosToAzureRequest
    {
        public string AccessToken { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string DestinationFolder { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public List<PickedPhotoItem> PhotoItems { get; set; } = default!;
    }

    public class PickedPhotoItem
    {
        public string Id { get; set; } = default!;
        public string BaseUrl { get; set; } = default!;
        public string MimeType { get; set; } = default!;
        public string Filename { get; set; } = default!;
    }
}

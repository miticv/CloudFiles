using System;
using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class FilesCopyRequest
    {
        public string AccessToken { get; set; } = default!;
        public string AlbumId { get; set; } = default!;
        public string AlbumTitle { get; set; } = default!;
        public List<Item> SelectedItemsList { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public string BucketName { get; set; } = default!;
    }

    public class FilesCopyRequestUI
    {
        public string AlbumId { get; set; } = default!;
        public string AlbumTitle { get; set; } = default!;
        public List<Item> SelectedItemsList { get; set; } = default!;
        public string AccountName { get; set; } = default!;
        public string ContainerName { get; set; } = default!;
        public string AzureAccessToken { get; set; } = default!;
        public string StartedBy { get; set; } = default!;
        public string BucketName { get; set; } = default!;
    }
}

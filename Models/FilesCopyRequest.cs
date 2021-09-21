using System;
using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class FilesCopyRequest
    {
        public string AccessToken { get; set; }
        public string AlbumId { get; set; }
        public List<Item> SelectedItemsList { get; set; }
    }

    public class FilesCopyRequestUI
    {
        public string AlbumId { get; set; }
        public List<Item> SelectedItemsList { get; set; }
    }
}

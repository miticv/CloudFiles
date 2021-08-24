using System;
using System.Collections.Generic;
using System.Text;

namespace AdaFile.Models
{
    public class FilesCopyRequest
    {
        public string AccessToken { get; set; }
        public string AlbumId { get; set; }
        public DateTime? CreationDateTime { get; set; }
        public List<Item> SelectedItemsList { get; set; }
    }
}

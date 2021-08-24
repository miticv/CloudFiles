using System;
using System.Collections.Generic;
using System.Text;

namespace AdaFile.Models
{
    public class Item
    {
        public Item(string itemPath, bool isFolder = false) {
            ItemPath = itemPath;
            IsFolder = isFolder;
        }

        public string ItemPath { get; set; }
        public bool IsFolder { get; set; }
        public DateTime? CreationDateTime { get; set; }
    }
}

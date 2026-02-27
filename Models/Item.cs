using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class Item
    {
        public Item() { }

        public Item(string itemPath, bool isFolder = false) {
            ItemPath = itemPath;
            IsFolder = isFolder;
        }

        public string ItemPath { get; set; }
        public bool IsFolder { get; set; }
    }

    public class ItemUI
    {
        public string ItemPath { get; set; }
        public bool IsFolder { get; set; }
        public string ItemName { get; set; }
        public string ItemType { get; set; }
    }

    public class ItemJsonUI
    {
        public string LastModified { get; set; }
        public long ContentLength { get; set; }
        public string ContentLengthFriendly { get; set; }

        public string ContentType { get; set; }
        public IDictionary<string, string> Metadata { get; set; }

        public string ItemPath { get; set; }
        public string ItemName { get; set; }
        public string ItemType { get; set; }
        public string ImageContent { get; set; }
    }
}

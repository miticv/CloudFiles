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

        public string ItemPath { get; set; } = default!;
        public bool IsFolder { get; set; }
    }

    public class ItemUI
    {
        public string ItemPath { get; set; } = default!;
        public bool IsFolder { get; set; }
        public string ItemName { get; set; } = default!;
        public string ItemType { get; set; } = default!;
    }

    public class ItemJsonUI
    {
        public string LastModified { get; set; } = default!;
        public long ContentLength { get; set; }
        public string ContentLengthFriendly { get; set; } = default!;

        public string ContentType { get; set; } = default!;
        public IDictionary<string, string> Metadata { get; set; } = default!;

        public string ItemPath { get; set; } = default!;
        public string ItemName { get; set; } = default!;
        public string ItemType { get; set; } = default!;
        public string ImageContent { get; set; } = default!;
    }
}

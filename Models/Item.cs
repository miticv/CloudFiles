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
}

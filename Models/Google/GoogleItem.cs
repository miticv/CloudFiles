namespace CloudFiles.Models.Google
{
    public class GoogleItem: Item
    {
        public GoogleItem() { }

        public GoogleItem(string itemPath, bool isFolder = false, string contentType = "", string medialLink = ""): base(itemPath, isFolder)
        {
            ContentType = contentType;
            MedialLink = medialLink;
        }

        public string ContentType { get; set; } = default!;
        public string MedialLink { get; set; } = default!;
    }
}

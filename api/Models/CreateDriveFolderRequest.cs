namespace CloudFiles.Models
{
    public class CreateDriveFolderRequest
    {
        public string GoogleAccessToken { get; set; } = default!;
        public string ParentFolderId { get; set; } = default!;
        public string FolderName { get; set; } = default!;
    }
}

using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class CreateDriveFolderTreeRequest
    {
        public string GoogleAccessToken { get; set; } = default!;
        public string RootFolderId { get; set; } = default!;
        public List<string> FolderPaths { get; set; } = default!;
    }
}

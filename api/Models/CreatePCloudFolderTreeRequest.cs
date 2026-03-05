using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class CreatePCloudFolderTreeRequest
    {
        public string PCloudAccessToken { get; set; } = default!;
        public string PCloudHostname { get; set; } = default!;
        public long RootFolderId { get; set; }
        public List<string> FolderPaths { get; set; } = default!;
    }
}

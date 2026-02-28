using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class BlobCopyResult
    {
        public string Filename { get; set; } = default!;
        public string BlobPath { get; set; } = default!;
        public long ContentLength { get; set; }
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
    }

    public class BlobCopyResultRoot
    {
        public List<BlobCopyResult> Results { get; set; } = new();
    }
}

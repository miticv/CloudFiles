using System.Collections.Generic;

namespace CloudFiles.Models
{
    public class GcsCopyResult
    {
        public string Filename { get; set; } = default!;
        public string ObjectName { get; set; } = default!;
        public long ContentLength { get; set; }
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
    }

    public class GcsCopyResultRoot
    {
        public List<GcsCopyResult> Results { get; set; } = new();
    }
}

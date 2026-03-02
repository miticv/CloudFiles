using System;
using System.Collections.Generic;
using System.Text;

namespace CloudFiles.Models.Azure
{
    public class AzureContainer
    {
        public string Id { get; set; } = default!;
        public string Name { get; set; } = default!;
        public DateTime LastModifiedTime { get; set; }
    }
}

using System;
using System.Collections.Generic;
using System.Text;

namespace CloudFiles.Models.Azure
{
    public class AzureContainer
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public DateTime LastModifiedTime { get; set; }
    }
}

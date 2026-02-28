using Azure.Storage.Blobs.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace CloudFiles.Models.Azure
{
    public class AzureStorageAccount
    {
        public string Id { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string Type { get; set; } = default!;
        public string Location { get; set; } = default!;
        public DateTime CreationTime { get; set; }
        public string AccessTier { get; set; } = default!;
        public PrimaryEndpoints PrimaryEndpoints { get; set; } = default!;
        public SecondaryEndpoints SecondaryEndpoints { get; set; } = default!;
    }
}

using Azure.Storage.Blobs.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace CloudFiles.Models.Azure
{
    public class AzureStorageAccount
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Type { get; set; }
        public string Location { get; set; }
        public DateTime CreationTime { get; set; }
        public string AccessTier { get; set; }
        public PrimaryEndpoints PrimaryEndpoints { get; set; }
        public SecondaryEndpoints SecondaryEndpoints { get; set; }
    }
}

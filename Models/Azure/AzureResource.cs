using System;
using System.Collections.Generic;
using System.Text;

namespace CloudFiles.Models.Azure
{
    public class AzureResource
    {
        public string Id { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string Location { get; set; } = default!;
    }
}

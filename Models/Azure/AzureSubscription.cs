using Microsoft.Azure.Management.ResourceManager.Models;

namespace CloudFiles.Models.Azure
{
    public class AzureSubscription
    {
        public string Id { get; set; }
        public string SubscriptionId { get; set; }
        public string DisplayName { get; set; }
        public string TenantId { get; set; }
        public SubscriptionState? State { get; set; }
    }
}

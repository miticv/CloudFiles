namespace CloudFiles.Models.Azure
{
    public class AzureSubscription
    {
        public string Id { get; set; }
        public string SubscriptionId { get; set; }
        public string DisplayName { get; set; }
        public string TenantId { get; set; }
        public string State { get; set; }
    }
}

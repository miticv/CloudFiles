namespace CloudFiles.Models.Azure
{
    public class AzureSubscription
    {
        public string Id { get; set; } = default!;
        public string SubscriptionId { get; set; } = default!;
        public string DisplayName { get; set; } = default!;
        public string TenantId { get; set; } = default!;
        public string State { get; set; } = default!;
    }
}

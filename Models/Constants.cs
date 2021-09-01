namespace CloudFiles.Models
{
    public static class Constants
    {
        public const string bffPing = "ping";
        // BFF
        public const string AzureFileList = "azureFileList";
        public const string AzureFileGetItem = "azureFileGetItem";
        public const string AzureSubscriptionList = "azureSubscriptionList";
        public const string AzureResourceGroupList = "azurListResourceGroupList";
        public const string AzureStorageAccountList = "azureStorageAccountList";
        public const string AzureContainerList = "azureContainerList";
        public const string GoogleToken = "googleToken";
        public const string GoogleValidateToken = "googleValidateToken";

        public const string GoogleAlbumList = "googleAlbumList";
        public const string GoogleAlbumAdd = "googleAlbumAdd";
        public const string GoogleGetServiceToken = "googleGetServiceToken";
        public const string GoogleFileList = "googleFileList";

        // public
        public const string ProcessAzureToGooglePhotos_Start = "processAzureToGooglePhotos_Start";
        public const string ProcessGooleStorageToGooglePhotos_Start = "processGooleStorageToGooglePhotos_Start";
        public const string ProcessListInstances = "processListInstances";

        // automation azure storage
        public const string AzureStorageToGooglePhotosOrchestrator = "azureStorageToGooglePhotosOrchestrator";
        public const string AzureStorageToGooglePhotosPrepareList =  "azureStorageToGooglePhotosPrepareList";
        public const string CopyAzureBlobsToGooglePhotosOrchestrator = "copyAzureBlobsToGooglePhotosOrchestrator";
        public const string CopyAzureBlobToGooglePhotos = "copyAzureBlobToGooglePhotos";

        // automation google storage
        public const string GooleStorageToGooglePhotosOrchestrator = "gooleStorageToGooglePhotosOrchestrator";
        public const string GoogleStorageToGooglePhotosPrepareList = "googleStorageToGooglePhotosPrepareList";
        public const string CopyGoogleStorageToGooglePhotosOrchestrator = "copyGoogleStorageToGooglePhotosOrchestrator";
        public const string CopyPhotoUrlToGooglePhotos = "copyPhotoUrlToGooglePhotos";
    }
}

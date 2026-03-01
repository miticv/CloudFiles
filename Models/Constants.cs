namespace CloudFiles.Models
{
    public static class Constants
    {
        public const string bffPing = "ping";
        // BFF
        public const string AzureFileList = "azureFileList";
        public const string AzureFileGetItem = "azureFileGetItem";
        public const string AzureFileGetItemJson = "azureFileGetItemJson";
        public const string AzureSubscriptionList = "azureSubscriptionList";
        public const string AzureResourceGroupList = "azurListResourceGroupList";
        public const string AzureStorageAccountList = "azureStorageAccountList";
        public const string AzureContainerList = "azureContainerList";
        public const string AzureAssignStorageRole = "azureAssignStorageRole";
        public const string AzureCheckStorageRole = "azureCheckStorageRole";
        public const string AzureProbeContainerAccess = "azureProbeContainerAccess";
        public const string GoogleToken = "googleToken";
        public const string GoogleValidateToken = "googleValidateToken";

        public const string GoogleAlbumList = "googleAlbumList";
        public const string GoogleAlbumAdd = "googleAlbumAdd";
        public const string GooglePhotosCreateSession = "googlePhotosCreateSession";
        public const string GooglePhotosGetSession = "googlePhotosGetSession";
        public const string GooglePhotosSessionMedia = "googlePhotosSessionMedia";
        public const string GooglePhotosDeleteSession = "googlePhotosDeleteSession";
        public const string GooglePhotosImageProxy = "googlePhotosImageProxy";
        // BFF Google Drive
        public const string GoogleDriveFileList = "googleDriveFileList";

        public const string GoogleFileList = "googleFileList";
        public const string GoogleStorageBucketList = "googleStorageBucketList";

        // public
        public const string ProcessAzureToGooglePhotos_Start = "processAzureToGooglePhotos_Start";
        public const string ProcessGoogleStorageToGooglePhotos_Start = "processGoogleStorageToGooglePhotos_Start";
        public const string ProcessListInstances = "processListInstances";
        public const string ProcessPurgeInstance = "processPurgeInstance";
        public const string ProcessGetInstance = "processGetInstance";

        // automation azure storage
        public const string AzureStorageToGooglePhotosOrchestrator = "azureStorageToGooglePhotosOrchestrator";
        public const string AzureStorageToGooglePhotosPrepareList =  "azureStorageToGooglePhotosPrepareList";
        public const string CopyAzureBlobsToGooglePhotosOrchestrator = "copyAzureBlobsToGooglePhotosOrchestrator";
        public const string UploadAzureBlobToGooglePhotos = "uploadAzureBlobToGooglePhotos";
        public const string CopyAzureBlobToGooglePhotos = "copyAzureBlobToGooglePhotos";

        // automation google storage
        public const string GoogleStorageToGooglePhotosOrchestrator = "googleStorageToGooglePhotosOrchestrator";
        public const string GoogleStorageToGooglePhotosPrepareList = "googleStorageToGooglePhotosPrepareList";
        public const string CopyGoogleStorageToGooglePhotosOrchestrator = "copyGoogleStorageToGooglePhotosOrchestrator";
        public const string UploadGoogleStorageToGooglePhotos = "uploadGoogleStorageToGooglePhotos";
        public const string CopyPhotoUrlToGooglePhotos = "copyPhotoUrlToGooglePhotos";

        // shared batch create for Google Photos
        public const string BatchCreateGoogleMediaItems = "batchCreateGoogleMediaItems";

        // automation google photos to azure
        public const string ProcessGooglePhotosToAzure_Start = "processGooglePhotosToAzure_Start";
        public const string GooglePhotosToAzureOrchestrator = "googlePhotosToAzureOrchestrator";
        public const string GooglePhotosToAzurePrepareList = "googlePhotosToAzurePrepareList";
        public const string CopyGooglePhotosToAzureOrchestrator = "copyGooglePhotosToAzureOrchestrator";
        public const string CopyGooglePhotoToAzureBlob = "copyGooglePhotoToAzureBlob";

        // automation google drive to azure
        public const string ProcessGoogleDriveToAzure_Start = "processGoogleDriveToAzure_Start";
        public const string GoogleDriveToAzureOrchestrator = "googleDriveToAzureOrchestrator";
        public const string GoogleDriveToAzurePrepareList = "googleDriveToAzurePrepareList";
        public const string CopyGoogleDriveToAzureOrchestrator = "copyGoogleDriveToAzureOrchestrator";
        public const string CopyGoogleDriveFileToAzureBlob = "copyGoogleDriveFileToAzureBlob";

        // Auth
        public const string AuthOAuthLogin = "authOAuthLogin";
        public const string AuthLocalLogin = "authLocalLogin";
        public const string AuthLocalRegister = "authLocalRegister";
        public const string AuthGetCurrentUser = "authGetCurrentUser";

        // Admin
        public const string AdminUserList = "adminUserList";
        public const string AdminUserUpdate = "adminUserUpdate";
    }
}

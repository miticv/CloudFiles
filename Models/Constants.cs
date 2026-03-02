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
        public const string ProcessRestartInstance = "processRestartInstance";
        public const string ProcessTerminateInstance = "processTerminateInstance";

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

        // automation Google Storage to Azure
        public const string ProcessGcsToAzure_Start = "processGcsToAzure_Start";
        public const string GcsToAzureOrchestrator = "gcsToAzureOrchestrator";
        public const string GcsToAzurePrepareList = "gcsToAzurePrepareList";
        public const string CopyGcsToAzureOrchestrator = "copyGcsToAzureOrchestrator";
        public const string CopyGcsObjectToAzureBlob = "copyGcsObjectToAzureBlob";

        // automation Azure to GCS
        public const string ProcessAzureToGcs_Start = "processAzureToGcs_Start";
        public const string AzureToGcsOrchestrator = "azureToGcsOrchestrator";
        public const string AzureToGcsPrepareList = "azureToGcsPrepareList";
        public const string CopyAzureToGcsOrchestrator = "copyAzureToGcsOrchestrator";
        public const string CopyAzureBlobToGcsObject = "copyAzureBlobToGcsObject";

        // BFF pCloud
        public const string PCloudOAuthCallback = "pcloudOAuthCallback";
        public const string PCloudFileList = "pcloudFileList";

        // BFF Dropbox
        public const string DropboxOAuthCallback = "dropboxOAuthCallback";
        public const string DropboxOAuthRefresh = "dropboxOAuthRefresh";
        public const string DropboxFileList = "dropboxFileList";
        public const string DropboxFileListContinue = "dropboxFileListContinue";
        public const string DropboxDownloadFile = "dropboxDownloadFile";
        public const string DropboxUploadFile = "dropboxUploadFile";

        // automation Dropbox to Azure
        public const string ProcessDropboxToAzure_Start = "processDropboxToAzure_Start";
        public const string DropboxToAzureOrchestrator = "dropboxToAzureOrchestrator";
        public const string DropboxToAzurePrepareList = "dropboxToAzurePrepareList";
        public const string CopyDropboxToAzureOrchestrator = "copyDropboxToAzureOrchestrator";
        public const string CopyDropboxFileToAzureBlob = "copyDropboxFileToAzureBlob";

        // automation Azure to Dropbox
        public const string ProcessAzureToDropbox_Start = "processAzureToDropbox_Start";
        public const string AzureToDropboxOrchestrator = "azureToDropboxOrchestrator";
        public const string AzureToDropboxPrepareList = "azureToDropboxPrepareList";
        public const string CopyAzureToDropboxOrchestrator = "copyAzureToDropboxOrchestrator";
        public const string CopyAzureBlobToDropboxFile = "copyAzureBlobToDropboxFile";

        // automation GCS to Dropbox
        public const string ProcessGcsToDropbox_Start = "processGcsToDropbox_Start";
        public const string GcsToDropboxOrchestrator = "gcsToDropboxOrchestrator";
        public const string GcsToDropboxPrepareList = "gcsToDropboxPrepareList";
        public const string CopyGcsToDropboxOrchestrator = "copyGcsToDropboxOrchestrator";
        public const string CopyGcsObjectToDropboxFile = "copyGcsObjectToDropboxFile";

        // automation GCS to Google Drive
        public const string ProcessGcsToDrive_Start = "processGcsToDrive_Start";
        public const string GcsToDriveOrchestrator = "gcsToDriveOrchestrator";
        public const string GcsToDrivePrepareList = "gcsToDrivePrepareList";
        public const string CopyGcsToDriveOrchestrator = "copyGcsToDriveOrchestrator";
        public const string CopyGcsObjectToDriveFile = "copyGcsObjectToDriveFile";

        // automation Dropbox to GCS
        public const string ProcessDropboxToGcs_Start = "processDropboxToGcs_Start";
        public const string DropboxToGcsOrchestrator = "dropboxToGcsOrchestrator";
        public const string DropboxToGcsPrepareList = "dropboxToGcsPrepareList";
        public const string CopyDropboxToGcsOrchestrator = "copyDropboxToGcsOrchestrator";
        public const string CopyDropboxFileToGcsObject = "copyDropboxFileToGcsObject";

        // automation Dropbox to Google Photos
        public const string ProcessDropboxToGooglePhotos_Start = "processDropboxToGooglePhotos_Start";
        public const string DropboxToGooglePhotosOrchestrator = "dropboxToGooglePhotosOrchestrator";
        public const string DropboxToGooglePhotosPrepareList = "dropboxToGooglePhotosPrepareList";
        public const string CopyDropboxToGooglePhotosOrchestrator = "copyDropboxToGooglePhotosOrchestrator";
        public const string UploadDropboxFileToGooglePhotos = "uploadDropboxFileToGooglePhotos";

        // automation Dropbox to Google Drive
        public const string ProcessDropboxToDrive_Start = "processDropboxToDrive_Start";
        public const string DropboxToDriveOrchestrator = "dropboxToDriveOrchestrator";
        public const string DropboxToDrivePrepareList = "dropboxToDrivePrepareList";
        public const string CopyDropboxToDriveOrchestrator = "copyDropboxToDriveOrchestrator";
        public const string CopyDropboxFileToDriveFile = "copyDropboxFileToDriveFile";

        // automation Azure to Google Drive
        public const string ProcessAzureToDrive_Start = "processAzureToDrive_Start";
        public const string AzureToDriveOrchestrator = "azureToDriveOrchestrator";
        public const string AzureToDrivePrepareList = "azureToDrivePrepareList";
        public const string CopyAzureToDriveOrchestrator = "copyAzureToDriveOrchestrator";
        public const string CopyAzureBlobToDriveFile = "copyAzureBlobToDriveFile";

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

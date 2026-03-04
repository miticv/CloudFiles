namespace CloudFiles.Models
{
    public static class Constants
    {
        public const string BffPing = "ping";
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

        // automation google storage
        public const string GoogleStorageToGooglePhotosOrchestrator = "googleStorageToGooglePhotosOrchestrator";
        public const string GoogleStorageToGooglePhotosPrepareList = "googleStorageToGooglePhotosPrepareList";
        public const string CopyGoogleStorageToGooglePhotosOrchestrator = "copyGoogleStorageToGooglePhotosOrchestrator";
        public const string UploadGoogleStorageToGooglePhotos = "uploadGoogleStorageToGooglePhotos";

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
        public const string PCloudDownloadFile = "pcloudDownloadFile";
        public const string PCloudUploadFile = "pcloudUploadFile";

        // automation PCloud to Azure
        public const string ProcessPCloudToAzure_Start = "processPCloudToAzure_Start";
        public const string PCloudToAzureOrchestrator = "pcloudToAzureOrchestrator";
        public const string PCloudToAzurePrepareList = "pcloudToAzurePrepareList";
        public const string CopyPCloudToAzureOrchestrator = "copyPCloudToAzureOrchestrator";
        public const string CopyPCloudFileToAzureBlob = "copyPCloudFileToAzureBlob";

        // automation Azure to PCloud
        public const string ProcessAzureToPCloud_Start = "processAzureToPCloud_Start";
        public const string AzureToPCloudOrchestrator = "azureToPCloudOrchestrator";
        public const string AzureToPCloudPrepareList = "azureToPCloudPrepareList";
        public const string CopyAzureToPCloudOrchestrator = "copyAzureToPCloudOrchestrator";
        public const string CopyAzureBlobToPCloudFile = "copyAzureBlobToPCloudFile";

        // automation PCloud to GCS
        public const string ProcessPCloudToGcs_Start = "processPCloudToGcs_Start";
        public const string PCloudToGcsOrchestrator = "pcloudToGcsOrchestrator";
        public const string PCloudToGcsPrepareList = "pcloudToGcsPrepareList";
        public const string CopyPCloudToGcsOrchestrator = "copyPCloudToGcsOrchestrator";
        public const string CopyPCloudFileToGcsObject = "copyPCloudFileToGcsObject";

        // automation GCS to PCloud
        public const string ProcessGcsToPCloud_Start = "processGcsToPCloud_Start";
        public const string GcsToPCloudOrchestrator = "gcsToPCloudOrchestrator";
        public const string GcsToPCloudPrepareList = "gcsToPCloudPrepareList";
        public const string CopyGcsToPCloudOrchestrator = "copyGcsToPCloudOrchestrator";
        public const string CopyGcsObjectToPCloudFile = "copyGcsObjectToPCloudFile";

        // automation PCloud to Google Photos
        public const string ProcessPCloudToGooglePhotos_Start = "processPCloudToGooglePhotos_Start";
        public const string PCloudToGooglePhotosOrchestrator = "pcloudToGooglePhotosOrchestrator";
        public const string PCloudToGooglePhotosPrepareList = "pcloudToGooglePhotosPrepareList";
        public const string CopyPCloudToGooglePhotosOrchestrator = "copyPCloudToGooglePhotosOrchestrator";
        public const string UploadPCloudFileToGooglePhotos = "uploadPCloudFileToGooglePhotos";

        // automation PCloud to Google Drive
        public const string ProcessPCloudToDrive_Start = "processPCloudToDrive_Start";
        public const string PCloudToDriveOrchestrator = "pcloudToDriveOrchestrator";
        public const string PCloudToDrivePrepareList = "pcloudToDrivePrepareList";
        public const string CopyPCloudToDriveOrchestrator = "copyPCloudToDriveOrchestrator";
        public const string CopyPCloudFileToDriveFile = "copyPCloudFileToDriveFile";

        // automation Google Drive to PCloud
        public const string ProcessGoogleDriveToPCloud_Start = "processGoogleDriveToPCloud_Start";
        public const string GoogleDriveToPCloudOrchestrator = "googleDriveToPCloudOrchestrator";
        public const string GoogleDriveToPCloudPrepareList = "googleDriveToPCloudPrepareList";
        public const string CopyGoogleDriveToPCloudOrchestrator = "copyGoogleDriveToPCloudOrchestrator";
        public const string CopyGoogleDriveFileToPCloudFile = "copyGoogleDriveFileToPCloudFile";

        // automation PCloud to Dropbox
        public const string ProcessPCloudToDropbox_Start = "processPCloudToDropbox_Start";
        public const string PCloudToDropboxOrchestrator = "pcloudToDropboxOrchestrator";
        public const string PCloudToDropboxPrepareList = "pcloudToDropboxPrepareList";
        public const string CopyPCloudToDropboxOrchestrator = "copyPCloudToDropboxOrchestrator";
        public const string CopyPCloudFileToDropbox = "copyPCloudFileToDropbox";

        // automation Dropbox to PCloud
        public const string ProcessDropboxToPCloud_Start = "processDropboxToPCloud_Start";
        public const string DropboxToPCloudOrchestrator = "dropboxToPCloudOrchestrator";
        public const string DropboxToPCloudPrepareList = "dropboxToPCloudPrepareList";
        public const string CopyDropboxToPCloudOrchestrator = "copyDropboxToPCloudOrchestrator";
        public const string CopyDropboxFileToPCloudFile = "copyDropboxFileToPCloudFile";

        // automation Google Photos to PCloud
        public const string ProcessGooglePhotosToPCloud_Start = "processGooglePhotosToPCloud_Start";
        public const string GooglePhotosToPCloudOrchestrator = "googlePhotosToPCloudOrchestrator";
        public const string GooglePhotosToPCloudPrepareList = "googlePhotosToPCloudPrepareList";
        public const string CopyGooglePhotosToPCloudOrchestrator = "copyGooglePhotosToPCloudOrchestrator";
        public const string CopyGooglePhotoToPCloudFile = "copyGooglePhotoToPCloudFile";

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

        // automation Google Drive to GCS
        public const string ProcessGoogleDriveToGcs_Start = "processGoogleDriveToGcs_Start";
        public const string GoogleDriveToGcsOrchestrator = "googleDriveToGcsOrchestrator";
        public const string GoogleDriveToGcsPrepareList = "googleDriveToGcsPrepareList";
        public const string CopyGoogleDriveToGcsOrchestrator = "copyGoogleDriveToGcsOrchestrator";
        public const string CopyGoogleDriveFileToGcsObject = "copyGoogleDriveFileToGcsObject";

        // automation Google Drive to Dropbox
        public const string ProcessGoogleDriveToDropbox_Start = "processGoogleDriveToDropbox_Start";
        public const string GoogleDriveToDropboxOrchestrator = "googleDriveToDropboxOrchestrator";
        public const string GoogleDriveToDropboxPrepareList = "googleDriveToDropboxPrepareList";
        public const string CopyGoogleDriveToDropboxOrchestrator = "copyGoogleDriveToDropboxOrchestrator";
        public const string CopyGoogleDriveFileToDropbox = "copyGoogleDriveFileToDropbox";

        // automation Google Drive to Google Photos
        public const string ProcessGoogleDriveToGooglePhotos_Start = "processGoogleDriveToGooglePhotos_Start";
        public const string GoogleDriveToGooglePhotosOrchestrator = "googleDriveToGooglePhotosOrchestrator";
        public const string GoogleDriveToGooglePhotosPrepareList = "googleDriveToGooglePhotosPrepareList";
        public const string CopyGoogleDriveToGooglePhotosOrchestrator = "copyGoogleDriveToGooglePhotosOrchestrator";
        public const string UploadGoogleDriveFileToGooglePhotos = "uploadGoogleDriveFileToGooglePhotos";

        // automation Azure to Google Drive
        public const string ProcessAzureToDrive_Start = "processAzureToDrive_Start";
        public const string AzureToDriveOrchestrator = "azureToDriveOrchestrator";
        public const string AzureToDrivePrepareList = "azureToDrivePrepareList";
        public const string CopyAzureToDriveOrchestrator = "copyAzureToDriveOrchestrator";
        public const string CopyAzureBlobToDriveFile = "copyAzureBlobToDriveFile";

        // automation Google Photos to GCS
        public const string ProcessGooglePhotosToGcs_Start = "processGooglePhotosToGcs_Start";
        public const string GooglePhotosToGcsOrchestrator = "googlePhotosToGcsOrchestrator";
        public const string GooglePhotosToGcsPrepareList = "googlePhotosToGcsPrepareList";
        public const string CopyGooglePhotosToGcsOrchestrator = "copyGooglePhotosToGcsOrchestrator";
        public const string CopyGooglePhotoToGcsObject = "copyGooglePhotoToGcsObject";

        // automation Google Photos to Dropbox
        public const string ProcessGooglePhotosToDropbox_Start = "processGooglePhotosToDropbox_Start";
        public const string GooglePhotosToDropboxOrchestrator = "googlePhotosToDropboxOrchestrator";
        public const string GooglePhotosToDropboxPrepareList = "googlePhotosToDropboxPrepareList";
        public const string CopyGooglePhotosToDropboxOrchestrator = "copyGooglePhotosToDropboxOrchestrator";
        public const string CopyGooglePhotoToDropbox = "copyGooglePhotoToDropbox";

        // automation Google Photos to Google Drive
        public const string ProcessGooglePhotosToGoogleDrive_Start = "processGooglePhotosToGoogleDrive_Start";
        public const string GooglePhotosToGoogleDriveOrchestrator = "googlePhotosToGoogleDriveOrchestrator";
        public const string GooglePhotosToGoogleDrivePrepareList = "googlePhotosToGoogleDrivePrepareList";
        public const string CopyGooglePhotosToGoogleDriveOrchestrator = "copyGooglePhotosToGoogleDriveOrchestrator";
        public const string CopyGooglePhotoToDriveFile = "copyGooglePhotoToDriveFile";

        // Google OAuth
        public const string GoogleOAuthToken = "googleOAuthToken";

        // Auth
        public const string AuthOAuthLogin = "authOAuthLogin";
        public const string AuthLocalLogin = "authLocalLogin";
        public const string AuthLocalRegister = "authLocalRegister";
        public const string AuthGetCurrentUser = "authGetCurrentUser";
        public const string AuthConfirmEmail = "authConfirmEmail";
        public const string AuthResendConfirmation = "authResendConfirmation";

        // Admin
        public const string AdminUserList = "adminUserList";
        public const string AdminUserUpdate = "adminUserUpdate";
    }
}

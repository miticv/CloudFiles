namespace AdaFile.Models
{
    public static class Constants
    {
        // BFF
        public const string azureFileList = "azureFileList";
        public const string azureFileGetItem = "azureFileGetItem";

        public const string googleToken = "googleToken";
        public const string googleAlbumList = "googleAlbumList";
        public const string googleAlbumAdd = "googleAlbumAdd";

        // public
        public const string ProcessAzureToGoogleStart = "processAzureToGooglestart";

        // automation
        public const string AzureToGoogleOrchestrator = "AzureToGoogleOrchestrator";
        public const string AzureToGooglePrepareList = "AzureToGooglePrepareList";
        public const string CopyBlobsToGoogleOrchestrator = "CopyBlobsToGoogleOrchestrator";
        public const string CopyBlobToGoogle = "CopyBlobToGoogle";
    }

}

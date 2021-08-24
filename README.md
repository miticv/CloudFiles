# AdaFile

## Setting up Storage Account connection string to Azure function app settings

![image](https://user-images.githubusercontent.com/3289670/128946485-b7546c62-158f-46e3-a8c0-bcfcb8d09bca.png)

## VSCode Compile and Build

![image](https://user-images.githubusercontent.com/3289670/128947756-ba992e11-39c3-4389-af57-ce43767ceed7.png)

## Settings

    "AzureWebJobsStorage": "Your orcherstrator web job storage ",
    "AzureStorage": "See settng up storage account connection above for your blob images",
    "AzureContainer": "images",
    "GooglePhotoClientId": "your google client id",
    "GooglePhotoClientSecret": "your google client secret",
    "UiRedirectUrl": "Your UI redirect url"


# Google token
    // https://medium.com/automationmaster/getting-google-oauth-access-token-using-google-apis-18b2ba11a11a
    //1: https://accounts.google.com/o/oauth2/auth?scope=https://www.googleapis.com/auth/photoslibrary&response_type=code&access_type=offline&redirect_uri=http://localhost:4200&client_id=994937085571-c3hodle0mbu7aq82dtp36bint621khjh.apps.googleusercontent.com
    //2: http://localhost:4200/?code=4%2F0AX4XfWi4THbsnlcFfJu2FcEsGHxCpTpLMfGuG3FiyApynfOHNFD3-Q_YIQqScRLzyGi3ZA&scope=https:%2F%2Fwww.googleapis.com%2Fauth%2Fphotoslibrary
    //3: POST https://accounts.google.com/o/oauth2/token
    // {
    // 	"client_id":"",
    // 	"client_secret":"",
    // 	"code": "",
    // 	"redirect_uri": "http://localhost:4200",
    // 	"grant_type":"authorization_code"
    // }
    // {
    //   "access_token": "ya29.a0ARrd...",
    //   "expires_in": 3599,
    //   "refresh_token": "1//04zKthVH...",
    //   "scope": "https://www.googleapis.com/auth/photoslibrary",
    //   "token_type": "Bearer"
    // }


# Library scopes
"https://www.googleapis.com/auth/photoslibrary", // See, upload and organise items in your Google Photos library (sesitive)
"https://www.googleapis.com/auth/photoslibrary.appendonly",  // Add to your Google Photos library  (sesitive)
"https://www.googleapis.com/auth/photoslibrary.sharing", // Manage and add to shared albums on your behalf (sesitive)
"https://www.googleapis.com/auth/photoslibrary.readonly", // View your Google Photos library (sesitive)
"https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata", // Manage photos added by this app (non-sesitive)
"https://www.googleapis.com/auth/photoslibrary.edit.appcreateddata", // Edit the info in your photos, videos and albums created within this app, including titles, descriptions and covers (non-sesitive)


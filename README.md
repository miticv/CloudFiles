# Cloud Files


# Google token
    // https://medium.com/automationmaster/getting-google-oauth-access-token-using-google-apis-18b2ba11a11a
    1: 
    https://accounts.google.com/o/oauth2/auth?scope=https://www.googleapis.com/auth/photoslibrary&response_type=code&access_type=offline&redirect_uri=http://localhost:7071/api/google/token&client_id=994937085571-c3hodle0mbu7aq82dtp36bint621khjh.apps.googleusercontent.com
    2: 
    http://localhost:4200/?code=4%2F0AX4XfWi4THbsnlcFfJu2FcEsGHxCpTpLMfGuG3FiyApynfOHNFD3-Q_YIQqScRLzyGi3ZA&scope=https:%2F%2Fwww.googleapis.com%2Fauth%2Fphotoslibrary
    3: 
    POST https://accounts.google.com/o/oauth2/token
    ```
    {
    	"client_id":"",
    	"client_secret":"",
    	"code": "",
    	"redirect_uri": "http://localhost:4200",
    	"grant_type":"authorization_code"
    }
    ```
    4:
    ```
    {
      "access_token": "ya29.a0ARrd...",
      "expires_in": 3599,
      "refresh_token": "1//04zKthVH...",
      "scope": "https://www.googleapis.com/auth/photoslibrary",
      "token_type": "Bearer"
    }
    ```

# Library scopes
"https://www.googleapis.com/auth/photoslibrary", // See, upload and organise items in your Google Photos library (sesitive)
"https://www.googleapis.com/auth/photoslibrary.appendonly",  // Add to your Google Photos library  (sesitive)
"https://www.googleapis.com/auth/photoslibrary.sharing", // Manage and add to shared albums on your behalf (sesitive)
"https://www.googleapis.com/auth/photoslibrary.readonly", // View your Google Photos library (sesitive)
"https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata", // Manage photos added by this app (non-sesitive)
"https://www.googleapis.com/auth/photoslibrary.edit.appcreateddata", // Edit the info in your photos, videos and albums created within this app, including titles, descriptions and covers (non-sesitive)


# google storage public (for google storage to google pictures )
https://cloud.google.com/storage/docs/access-control/making-data-public

only these token can call google storage apis:
https://cloud.google.com/docs/authentication

# 
https://loiane.com/2020/05/deploying-angular-to-azure-static-web-apps/

# Google secret for deploying static website:

AZURE_STATIC_WEB_APPS_API_TOKEN_WONDERFUL_HILL_0CA4C2B0F
value is inside "Manage deployment token" inside cloud-files-web Static Web app in Azure
# Google secret for deploying bff azure functions:

CLOUDFILES_DEPLOYAZUREFUNCTIONS
`az webapp deployment list-publishing-profiles --name cloud-files-api --resource-group CloudFiles --subscription e7feae5d-2e46-470e-a5b3-5eb025fd598e --xml`

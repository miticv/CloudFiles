// CloudFiles Azure Infrastructure
// This Bicep file documents all resources in the resource_cloud-files resource group.
// Usage: az deployment group create -g resource_cloud-files -f infra/main.bicep -f infra/main.bicepparam

targetScope = 'resourceGroup'

// ──────────────────────────────────────────────
// Parameters
// ──────────────────────────────────────────────

@description('Azure region for all resources')
param location string = 'eastus2'

@description('Storage account name')
param storageAccountName string = 'cloudfilesstorage1'

@description('Function App name')
param functionAppName string = 'cloud-files-api'

@description('App Service Plan name')
param appServicePlanName string = 'ASP-CloudFiles-93d0'

@description('Static Web App name')
param staticWebAppName string = 'cloud-files-web'

@description('Application Insights name')
param appInsightsName string = 'cloud-files-api'

// Secret parameters — must be supplied at deploy time
@secure()
@description('JWT signing secret for CloudFiles app auth')
param jwtSecret string

@secure()
@description('Google OAuth client secret')
param googleClientSecret string

@secure()
@description('Google Photos client ID')
param googlePhotoClientId string

@secure()
@description('Dropbox OAuth app key')
param dropboxKey string

@secure()
@description('Dropbox OAuth app secret')
param dropboxSecret string

@secure()
@description('pCloud OAuth client ID')
param pcloudClientId string

@secure()
@description('pCloud OAuth client secret')
param pcloudClientSecret string

@secure()
@description('Azure Communication Services connection string')
param acsConnectionString string

@secure()
@description('Azure Communication Services sender email')
param acsSenderAddress string

@description('Admin email addresses (comma-separated)')
param adminEmails string

@description('Azure AD tenant ID for OIDC')
param azureTenantId string

@description('App base URL')
param appBaseUrl string = 'https://cloud-files.link'

@description('Feature flag: test fail filename contains')
param featureFlagTestFailFilenameContains string = ''

// ──────────────────────────────────────────────
// Storage Account
// ──────────────────────────────────────────────

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

// ──────────────────────────────────────────────
// Application Insights
// ──────────────────────────────────────────────

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    RetentionInDays: 90
  }
}

// ──────────────────────────────────────────────
// App Service Plan (Consumption / Dynamic)
// ──────────────────────────────────────────────

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  kind: 'functionapp'
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
}

// ──────────────────────────────────────────────
// Function App
// ──────────────────────────────────────────────

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      netFrameworkVersion: 'v8.0'
      minTlsVersion: '1.2'
      cors: {
        allowedOrigins: [
          'https://localhost:4200'
          'http://localhost:4200'
          'https://www.cloud-files.link'
          'https://cloud-files.link'
          'https://cloud-files-web.azurestaticapps.net'
        ]
        supportCredentials: true
      }
      appSettings: [
        { name: 'AzureWebJobsStorage', value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net' }
        { name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING', value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net' }
        { name: 'WEBSITE_CONTENTSHARE', value: functionAppName }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'dotnet-isolated' }
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }
        { name: 'APPINSIGHTS_INSTRUMENTATIONKEY', value: appInsights.properties.InstrumentationKey }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        { name: 'JWT_SECRET', value: jwtSecret }
        { name: 'GoogleClientSecret', value: googleClientSecret }
        { name: 'GooglePhotoClientId', value: googlePhotoClientId }
        { name: 'DropBoxKey', value: dropboxKey }
        { name: 'DropBoxSecret', value: dropboxSecret }
        { name: 'PCloudClientId', value: pcloudClientId }
        { name: 'PCloudClientSecret', value: pcloudClientSecret }
        { name: 'ACS_CONNECTION_STRING', value: acsConnectionString }
        { name: 'ACS_SENDER_ADDRESS', value: acsSenderAddress }
        { name: 'ADMIN_EMAILS', value: adminEmails }
        { name: 'AzureTenantId', value: azureTenantId }
        { name: 'APP_BASE_URL', value: appBaseUrl }
        { name: 'FEATURE_FLAG_TEST_FAIL_FILENAME_CONTAINS', value: featureFlagTestFailFilenameContains }
      ]
    }
  }
}

// ──────────────────────────────────────────────
// Function App — Custom hostname binding
// ──────────────────────────────────────────────

resource apiCustomDomain 'Microsoft.Web/sites/hostNameBindings@2023-12-01' = {
  parent: functionApp
  name: 'api.cloud-files.link'
  properties: {
    siteName: functionAppName
    hostNameType: 'Verified'
    sslState: 'SniEnabled'
    // Managed certificate thumbprint is generated after deployment;
    // bind via: az webapp config ssl create + az webapp config ssl bind
  }
}

// ──────────────────────────────────────────────
// Static Web App
// ──────────────────────────────────────────────

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {}
}

// Note: Static Web App custom domains (cloud-files.link, www.cloud-files.link)
// are configured via: az staticwebapp hostname set

// ──────────────────────────────────────────────
// Outputs
// ──────────────────────────────────────────────

output functionAppDefaultHostname string = functionApp.properties.defaultHostName
output staticWebAppDefaultHostname string = staticWebApp.properties.defaultHostname
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output storageAccountName string = storageAccount.name

using './main.bicep'

// ──────────────────────────────────────────────
// Non-secret defaults
// ──────────────────────────────────────────────

param location = 'eastus2'
param storageAccountName = 'cloudfilesstorage1'
param functionAppName = 'cloud-files-api'
param appServicePlanName = 'ASP-CloudFiles-93d0'
param staticWebAppName = 'cloud-files-web'
param appInsightsName = 'cloud-files-api'
param appBaseUrl = 'https://cloud-files.link'
param featureFlagTestFailFilenameContains = ''

// ──────────────────────────────────────────────
// Values — fill these in or supply via CLI
// ──────────────────────────────────────────────

param adminEmails = 'miticv@gmail.com'
param azureTenantId = 'b3f2bf8d-6397-4c87-9c9a-ec7ce704004c'

// ──────────────────────────────────────────────
// Secrets — supply at deploy time via CLI or Key Vault
// Example: az deployment group create -g resource_cloud-files \
//            -f infra/main.bicep -f infra/main.bicepparam \
//            -p jwtSecret='...' googleClientSecret='...' ...
// ──────────────────────────────────────────────

param jwtSecret = readEnvironmentVariable('JWT_SECRET', '')
param googleClientSecret = readEnvironmentVariable('GOOGLE_CLIENT_SECRET', '')
param googlePhotoClientId = readEnvironmentVariable('GOOGLE_PHOTO_CLIENT_ID', '')
param dropboxKey = readEnvironmentVariable('DROPBOX_KEY', '')
param dropboxSecret = readEnvironmentVariable('DROPBOX_SECRET', '')
param pcloudClientId = readEnvironmentVariable('PCLOUD_CLIENT_ID', '')
param pcloudClientSecret = readEnvironmentVariable('PCLOUD_CLIENT_SECRET', '')
param acsConnectionString = readEnvironmentVariable('ACS_CONNECTION_STRING', '')
param acsSenderAddress = readEnvironmentVariable('ACS_SENDER_ADDRESS', '')

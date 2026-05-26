param(
    [string]$ResourceGroup = "resource_cloud-files",
    [string]$FunctionAppName = "cloud-files-api",
    [string]$StorageAccount = "cloudfilesstorage1",
    [string]$Container = "deployments",
    [string]$BlobName = "latest.zip"
)

$ErrorActionPreference = "Stop"
$WorkDir = $PSScriptRoot
$PublishDir = Join-Path $WorkDir ".deploy-tmp\published"
$ZipPath = Join-Path $WorkDir ".deploy-tmp\deploy.zip"

Write-Host "==> Building and publishing..." -ForegroundColor Cyan
dotnet publish "$WorkDir\api" --configuration Release --output $PublishDir
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "==> Creating zip..." -ForegroundColor Cyan
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path "$PublishDir\*" -DestinationPath $ZipPath

Write-Host "==> Uploading to blob storage..." -ForegroundColor Cyan
$key = az storage account keys list `
    --account-name $StorageAccount `
    --resource-group $ResourceGroup `
    --query "[0].value" -o tsv
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to get storage key. Are you logged in? Run: az login"; exit 1 }

az storage blob upload `
    --account-name $StorageAccount `
    --account-key $key `
    --container-name $Container `
    --name $BlobName `
    --file $ZipPath `
    --overwrite true
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "==> Generating SAS URL..." -ForegroundColor Cyan
$expiry = (Get-Date).AddYears(1).ToString("yyyy-MM-ddTHH:mm:ssZ")
$sas = az storage blob generate-sas `
    --account-name $StorageAccount `
    --account-key $key `
    --container-name $Container `
    --name $BlobName `
    --permissions r `
    --expiry $expiry `
    --output tsv
$blobUrl = "https://$StorageAccount.blob.core.windows.net/$Container/$BlobName`?$sas"

Write-Host "==> Updating WEBSITE_RUN_FROM_PACKAGE..." -ForegroundColor Cyan
# Use ARM REST API directly — az CLI splits on & in the URL, corrupting the SAS token
$sub = az account show --query id -o tsv
$token = az account get-access-token --resource https://management.azure.com --query accessToken -o tsv
$baseUrl = "https://management.azure.com/subscriptions/$sub/resourceGroups/$ResourceGroup/providers/Microsoft.Web/sites/$FunctionAppName"
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

$current = Invoke-RestMethod -Uri "$baseUrl/config/appsettings/list?api-version=2023-12-01" -Method POST -Headers $headers
$props = @{}
$current.properties.PSObject.Properties | ForEach-Object { $props[$_.Name] = $_.Value }
$props["WEBSITE_RUN_FROM_PACKAGE"] = $blobUrl

$bodyFile = Join-Path $env:TEMP "deploy-appsettings.json"
@{ properties = $props } | ConvertTo-Json -Depth 5 | Out-File $bodyFile -Encoding utf8
Invoke-RestMethod -Uri "$baseUrl/config/appsettings?api-version=2023-12-01" -Method PUT -Headers $headers -Body (Get-Content $bodyFile -Raw) | Out-Null
Remove-Item $bodyFile

Write-Host "==> Restarting Function App..." -ForegroundColor Cyan
az functionapp restart --name $FunctionAppName --resource-group $ResourceGroup
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "==> Cleaning up temp files..." -ForegroundColor Cyan
Remove-Item (Join-Path $WorkDir ".deploy-tmp") -Recurse -Force

Write-Host ""
Write-Host "Deployed successfully. Verifying..." -ForegroundColor Green
Start-Sleep -Seconds 10
$code = (Invoke-WebRequest -Uri "https://api.cloud-files.link/api/ping" -UseBasicParsing -TimeoutSec 20 -ErrorAction SilentlyContinue).StatusCode
Write-Host "Status: $code"

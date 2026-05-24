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
az functionapp config appsettings set `
    --name $FunctionAppName `
    --resource-group $ResourceGroup `
    --settings "WEBSITE_RUN_FROM_PACKAGE=$blobUrl"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "==> Restarting Function App..." -ForegroundColor Cyan
az functionapp restart --name $FunctionAppName --resource-group $ResourceGroup
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "==> Cleaning up temp files..." -ForegroundColor Cyan
Remove-Item (Join-Path $WorkDir ".deploy-tmp") -Recurse -Force

Write-Host ""
Write-Host "Deployed successfully. Verifying..." -ForegroundColor Green
Start-Sleep -Seconds 10
$response = curl -s -w "`n%{http_code}" --max-time 20 "https://api.cloud-files.link/api/ping" 2>$null
Write-Host $response

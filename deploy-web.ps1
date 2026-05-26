param(
    [string]$ResourceGroup = "resource_cloud-files",
    [string]$SwaName = "cloud-files-web"
)

$ErrorActionPreference = "Stop"
$WorkDir = $PSScriptRoot
$EnvFile = Join-Path $WorkDir "web\src\env.ts"
$EnvBackup = Join-Path $WorkDir "web\src\env.ts.bak"

# Helper: extract a single-quoted value from env.ts
function Get-EnvValue([string]$content, [string]$key) {
    if ($content -match "${key}:\s*'([^']*)'") { return $Matches[1] }
    throw "Could not extract '$key' from env.ts"
}

Write-Host "==> Reading local env.ts values..." -ForegroundColor Cyan
$local = Get-Content $EnvFile -Raw

$productionEnv = @"
export const env = {
  production: true,
  api: 'https://api.cloud-files.link/api/',
  googleClientId: '$(Get-EnvValue $local "googleClientId")',
  azureTenantId: '$(Get-EnvValue $local "azureTenantId")',
  azureClientId: 'b0d156f7-f1b5-431d-81c6-c169d6e01405',
  adminEmail: '$(Get-EnvValue $local "adminEmail")',
  pCloudClientId: '$(Get-EnvValue $local "pCloudClientId")',
  dropboxClientId: '$(Get-EnvValue $local "dropboxClientId")',
  appInsightsConnectionString: '$(Get-EnvValue $local "appInsightsConnectionString")',
  featureAppleDrive: false,
};
"@

# Swap in production env, build, then restore
Copy-Item $EnvFile $EnvBackup
try {
    Write-Host "==> Writing production env.ts..." -ForegroundColor Cyan
    $productionEnv | Out-File $EnvFile -Encoding utf8 -NoNewline

    Write-Host "==> Building frontend..." -ForegroundColor Cyan
    Push-Location (Join-Path $WorkDir "web")
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
    Pop-Location

    Write-Host "==> Getting SWA deployment token..." -ForegroundColor Cyan
    $token = az staticwebapp secrets list `
        --name $SwaName `
        --resource-group $ResourceGroup `
        --query "properties.apiKey" -o tsv
    if (!$token) { throw "Failed to get deployment token. Are you logged in? Run: az login" }

    Write-Host "==> Deploying to Azure Static Web Apps..." -ForegroundColor Cyan
    $distPath = Join-Path $WorkDir "web\dist"
    npx --yes @azure/static-web-apps-cli@latest deploy $distPath `
        --deployment-token $token `
        --env production
    if ($LASTEXITCODE -ne 0) { throw "SWA deploy failed" }

    Write-Host ""
    Write-Host "Frontend deployed successfully." -ForegroundColor Green
    Write-Host "Verifying..."
    $code = (Invoke-WebRequest -Uri "https://cloud-files.link" -UseBasicParsing -TimeoutSec 20 -ErrorAction SilentlyContinue).StatusCode
    Write-Host "https://cloud-files.link -> $code"
} finally {
    Move-Item $EnvBackup $EnvFile -Force
    Write-Host "==> Restored local env.ts." -ForegroundColor DarkGray
}

#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BW_ITEM_NAME="CloudFiles"

# --- Helper functions ---

check_tool() {
    if ! command -v "$1" &>/dev/null; then
        echo "Error: '$1' is not installed."
        echo "  Install with: $2"
        exit 1
    fi
}

get_field() {
    local item_json="$1"
    local field_name="$2"
    echo "$item_json" | jq -r --arg name "$field_name" '.fields[]? | select(.name == $name) | .value // empty'
}

# --- Preflight checks ---

echo "=== CloudFiles Secrets Setup ==="
echo ""

check_tool "bw" "npm install -g @bitwarden/cli"
check_tool "jq" "https://jqlang.github.io/jq/download/"

# --- Bitwarden authentication ---

BW_STATUS=$(bw status | jq -r '.status')

if [ "$BW_STATUS" = "unauthenticated" ]; then
    echo "Bitwarden: not logged in. Logging in..."
    bw login
    BW_STATUS=$(bw status | jq -r '.status')
fi

if [ "$BW_STATUS" = "locked" ]; then
    echo "Bitwarden: vault is locked. Unlocking..."
    export BW_SESSION=$(bw unlock --raw)
elif [ "$BW_STATUS" = "unlocked" ]; then
    # Session may already be set via env var
    if [ -z "${BW_SESSION:-}" ]; then
        echo "Bitwarden: vault unlocked but no session. Unlocking..."
        export BW_SESSION=$(bw unlock --raw)
    fi
fi

echo "Bitwarden: syncing vault..."
bw sync --session "$BW_SESSION" > /dev/null 2>&1

# --- Retrieve the item ---

echo "Retrieving '$BW_ITEM_NAME' from Bitwarden..."
ITEM_JSON=$(bw get item "$BW_ITEM_NAME" --session "$BW_SESSION" 2>/dev/null) || {
    echo "Error: Could not find Bitwarden item '$BW_ITEM_NAME'."
    echo "Please create it with the required custom fields. See README or plan for details."
    exit 1
}

# --- Extract fields ---

GOOGLE_CLIENT_ID=$(get_field "$ITEM_JSON" "GoogleClientId")
GOOGLE_CLIENT_SECRET=$(get_field "$ITEM_JSON" "GoogleClientSecret")
AZURE_TENANT_ID=$(get_field "$ITEM_JSON" "AzureTenantId")
AZURE_CLIENT_ID=$(get_field "$ITEM_JSON" "AzureClientId")
GOOGLE_BUCKET=$(get_field "$ITEM_JSON" "GoogleBucket")
GOOGLE_SERVICE_JSON=$(get_field "$ITEM_JSON" "GoogleServiceJsonFileName")
PRODUCTION_API_URL=$(get_field "$ITEM_JSON" "ProductionApiUrl")

# Validate required fields
MISSING=()
[ -z "$GOOGLE_CLIENT_ID" ] && MISSING+=("GoogleClientId")
[ -z "$GOOGLE_CLIENT_SECRET" ] && MISSING+=("GoogleClientSecret")
[ -z "$AZURE_TENANT_ID" ] && MISSING+=("AzureTenantId")
[ -z "$AZURE_CLIENT_ID" ] && MISSING+=("AzureClientId")

if [ ${#MISSING[@]} -gt 0 ]; then
    echo "Error: Missing required fields in Bitwarden item '$BW_ITEM_NAME':"
    printf '  - %s\n' "${MISSING[@]}"
    exit 1
fi

echo "All required fields retrieved."
echo ""

# --- Generate local.settings.json ---

LOCAL_SETTINGS="$SCRIPT_DIR/local.settings.json"
cat > "$LOCAL_SETTINGS" <<EOF
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "GoogleBucket": "${GOOGLE_BUCKET:-<gcs-bucket-name>}",
    "GoogleServiceJsonFileName": "${GOOGLE_SERVICE_JSON:-<path-to-service-account-key.json>}",
    "GooglePhotoClientId": "$GOOGLE_CLIENT_ID",
    "AzureTenantId": "$AZURE_TENANT_ID",
    "IS_RUNNING_LOCALLY": "true"
  },
  "Host": {
    "LocalHttpPort": 7071,
    "CORS": "https://cloud-files-web.azurestaticapps.net,http://localhost:4200",
    "CORSCredentials": true
  }
}
EOF
echo "Generated: local.settings.json"

# --- Generate environment.ts (dev) ---

ENV_DIR="$SCRIPT_DIR/Web.UI/src/environments"
ENV_DEV="$ENV_DIR/environment.ts"

cat > "$ENV_DEV" <<EOF
export const environment = {
    production: false,
    api: '/api/',
    googleClientId: '$GOOGLE_CLIENT_ID',
    googleClientSecret: '$GOOGLE_CLIENT_SECRET',
    azureTenantId: '$AZURE_TENANT_ID',
    azureClientId: '$AZURE_CLIENT_ID',
};
EOF
echo "Generated: Web.UI/src/environments/environment.ts"

# --- Generate environment.prod.ts ---

ENV_PROD="$ENV_DIR/environment.prod.ts"

cat > "$ENV_PROD" <<EOF
export const environment = {
    production: true,
    api: '${PRODUCTION_API_URL:-https://api.cloud-files.link/api/}',
    googleClientId: '$GOOGLE_CLIENT_ID',
    googleClientSecret: '$GOOGLE_CLIENT_SECRET',
    azureTenantId: '$AZURE_TENANT_ID',
    azureClientId: '$AZURE_CLIENT_ID',
};
EOF
echo "Generated: Web.UI/src/environments/environment.prod.ts"

echo ""
echo "=== Done! All config files have been populated from Bitwarden. ==="

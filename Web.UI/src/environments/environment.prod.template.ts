// This file is a template. Run `bash setup-secrets.sh` to generate environment.prod.ts from Bitwarden.

export const environment = {
    production: true,
    api: '__PRODUCTION_API_URL__',
    googleClientId: '__GOOGLE_CLIENT_ID__',
    googleClientSecret: '__GOOGLE_CLIENT_SECRET__',
    azureTenantId: '__AZURE_TENANT_ID__',
    azureClientId: '__AZURE_CLIENT_ID__',
};

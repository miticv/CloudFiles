// This file is a template. Run `bash setup-secrets.sh` to generate environment.ts from Bitwarden.

export const environment = {
    production: false,
    api: '/api/',
    googleClientId: '__GOOGLE_CLIENT_ID__',
    googleClientSecret: '__GOOGLE_CLIENT_SECRET__',
    azureTenantId: '__AZURE_TENANT_ID__',
    azureClientId: '__AZURE_CLIENT_ID__',
};

import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { env } from '@/env';

export const googleManager = new UserManager({
  authority: 'https://accounts.google.com',
  client_id: env.googleClientId,
  redirect_uri: window.location.origin,
  post_logout_redirect_uri: window.location.origin,
  response_type: 'code',
  scope: [
    'openid email profile',
    'https://www.googleapis.com/auth/photoslibrary.appendonly',
    'https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata',
    'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
    'https://www.googleapis.com/auth/devstorage.read_write',
    'https://www.googleapis.com/auth/drive.file',
  ].join(' '),
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: localStorage }),
  extraQueryParams: { access_type: 'offline', prompt: 'consent' },
  metadata: {
    issuer: 'https://accounts.google.com',
    authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_endpoint: `${env.api}google/oauth/token`,
    userinfo_endpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
    jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
    revocation_endpoint: 'https://oauth2.googleapis.com/revoke',
  },
});

export const azureManager = new UserManager({
  authority: `https://login.microsoftonline.com/${env.azureTenantId}`,
  metadataUrl: `https://login.microsoftonline.com/${env.azureTenantId}/v2.0/.well-known/openid-configuration`,
  client_id: env.azureClientId,
  redirect_uri: window.location.origin,
  post_logout_redirect_uri: window.location.origin,
  response_type: 'code',
  scope: 'openid profile offline_access https://management.azure.com/user_impersonation',
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: localStorage, prefix: 'oidc.azure.' }),
  stateStore: new WebStorageStateStore({ store: localStorage, prefix: 'oidc.azure.' }),
});

export const azureStorageManager = new UserManager({
  authority: `https://login.microsoftonline.com/${env.azureTenantId}`,
  metadataUrl: `https://login.microsoftonline.com/${env.azureTenantId}/v2.0/.well-known/openid-configuration`,
  client_id: env.azureClientId,
  redirect_uri: window.location.origin,
  post_logout_redirect_uri: window.location.origin,
  response_type: 'code',
  scope: 'openid profile offline_access https://storage.azure.com/user_impersonation',
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: localStorage, prefix: 'oidc.azure-storage.' }),
  stateStore: new WebStorageStateStore({ store: localStorage, prefix: 'oidc.azure-storage.' }),
});

export type OidcConfigId = 'google' | 'azure' | 'azure-storage';

export function getManager(configId: OidcConfigId): UserManager {
  switch (configId) {
    case 'google': return googleManager;
    case 'azure': return azureManager;
    case 'azure-storage': return azureStorageManager;
  }
}

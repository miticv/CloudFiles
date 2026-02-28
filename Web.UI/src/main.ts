import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideRouterStore, routerReducer } from '@ngrx/router-store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideAuth, LogLevel, withAppInitializerAuthCheck, AbstractSecurityStorage, DefaultLocalStorageService } from 'angular-auth-oidc-client';

import { AppComponent } from './app/app.component';
import { rootRouterConfig } from './app/app.routing';
import { environment } from './environments/environment';
import { AuthInterceptor } from './app/core/auth/auth.interceptor';

if (environment.production) {
    enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        provideRouter(rootRouterConfig),
        provideAnimations(),
        provideHttpClient(withInterceptorsFromDi()),
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
        { provide: AbstractSecurityStorage, useClass: DefaultLocalStorageService },
        provideStore({ router: routerReducer }),
        provideEffects([]),
        provideRouterStore(),
        ...(!environment.production ? [provideStoreDevtools({ maxAge: 25 })] : []),
        provideAuth({
            config: [
                {
                    configId: 'google',
                    authority: 'https://accounts.google.com',
                    redirectUrl: window.location.origin,
                    clientId: environment.googleClientId,
                    responseType: 'code',
                    scope: [
                        'openid email profile',
                        'https://www.googleapis.com/auth/photoslibrary.appendonly',
                        'https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata',
                        'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
                        'https://www.googleapis.com/auth/devstorage.read_only',
                    ].join(' '),
                    triggerAuthorizationResultEvent: true,
                    postLogoutRedirectUri: window.location.origin,
                    startCheckSession: false,
                    silentRenew: true,
                    useRefreshToken: true,
                    ignoreNonceAfterRefresh: true,
                    customParamsAuthRequest: {
                        access_type: 'offline',
                        prompt: 'consent'
                    },
                    customParamsCodeRequest: {
                        client_secret: environment.googleClientSecret
                    },
                    customParamsRefreshTokenRequest: {
                        client_secret: environment.googleClientSecret
                    },
                    postLoginRoute: '/sessions/signin',
                    forbiddenRoute: '/sessions/signin',
                    unauthorizedRoute: '/sessions/signin',
                    logLevel: LogLevel.Error,
                },
                {
                    configId: 'azure',
                    authority: `https://login.microsoftonline.com/${environment.azureTenantId}`,
                    authWellknownEndpointUrl:
                        `https://login.microsoftonline.com/${environment.azureTenantId}/v2.0/.well-known/openid-configuration`,
                    redirectUrl: window.location.origin,
                    postLogoutRedirectUri: window.location.origin,
                    clientId: environment.azureClientId,
                    scope: 'openid profile https://management.azure.com/user_impersonation',
                    responseType: 'code',
                    silentRenew: true,
                    useRefreshToken: true,
                    ignoreNonceAfterRefresh: true,
                    maxIdTokenIatOffsetAllowedInSeconds: 600,
                    issValidationOff: false,
                    autoUserInfo: false,
                    logLevel: LogLevel.Error,
                },
                {
                    configId: 'azure-storage',
                    authority: `https://login.microsoftonline.com/${environment.azureTenantId}`,
                    authWellknownEndpointUrl:
                        `https://login.microsoftonline.com/${environment.azureTenantId}/v2.0/.well-known/openid-configuration`,
                    redirectUrl: window.location.origin,
                    postLogoutRedirectUri: window.location.origin,
                    clientId: environment.azureClientId,
                    scope: 'openid profile https://storage.azure.com/user_impersonation',
                    responseType: 'code',
                    silentRenew: true,
                    useRefreshToken: true,
                    ignoreNonceAfterRefresh: true,
                    maxIdTokenIatOffsetAllowedInSeconds: 600,
                    issValidationOff: false,
                    autoUserInfo: false,
                    logLevel: LogLevel.Error,
                }
            ]
        }, withAppInitializerAuthCheck()),
    ]
}).catch(err => console.error(err));

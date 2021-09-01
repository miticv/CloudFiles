import { NgModule } from '@angular/core';
import { AuthModule, LogLevel } from 'angular-auth-oidc-client';



@NgModule({
    imports: [AuthModule.forRoot({
        config: [{
            authority: 'https://accounts.google.com',
            redirectUrl: window.location.origin,
            //clientId: '542174635827-0t4g2snhr025q4ldvorcvhvmc14ielvj.apps.googleusercontent.com',
            clientId: '994937085571-c3hodle0mbu7aq82dtp36bint621khjh.apps.googleusercontent.com',
            responseType: 'id_token token',
            scope: 'openid email profile https://www.googleapis.com/auth/photoslibrary',
            triggerAuthorizationResultEvent: true,
            postLogoutRedirectUri: window.location.origin + '/unauthorized',
            startCheckSession: false,
            silentRenew: true,
            silentRenewUrl: window.location.origin + '/silent-renew.html',
            postLoginRoute: '/home',
            forbiddenRoute: '/forbidden',
            unauthorizedRoute: '/unauthorized',
            logLevel: LogLevel.Debug,
            historyCleanupOff: true,
            useRefreshToken: true,
        },
        {
            authority: 'https://login.microsoftonline.com/b3f2bf8d-6397-4c87-9c9a-ec7ce704004c',
            authWellknownEndpointUrl:
                'https://login.microsoftonline.com/b3f2bf8d-6397-4c87-9c9a-ec7ce704004c/v2.0/.well-known/openid-configuration',
            redirectUrl: window.location.origin,
            postLogoutRedirectUri: window.location.origin,
            clientId: 'b0d156f7-f1b5-431d-81c6-c169d6e01405',
            scope: 'openid profile https://management.azure.com/user_impersonation',
            responseType: 'code',
            silentRenew: true,
            useRefreshToken: true,
            ignoreNonceAfterRefresh: true,
            maxIdTokenIatOffsetAllowedInSeconds: 600,
            issValidationOff: false, // this needs to be true if using a common endpoint in Azure
            autoUserInfo: false,
            logLevel: LogLevel.Debug,
        }]
    })],
    exports: [AuthModule],


})
export class AuthConfigModule { }

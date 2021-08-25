import { NgModule } from '@angular/core';
import { AuthModule, LogLevel } from 'angular-auth-oidc-client';



@NgModule({
    imports: [AuthModule.forRoot({
        config: {
            authority: 'https://accounts.google.com',
            redirectUrl: 'https://localhost:4200',
            //clientId: '542174635827-0t4g2snhr025q4ldvorcvhvmc14ielvj.apps.googleusercontent.com',
            clientId: '994937085571-c3hodle0mbu7aq82dtp36bint621khjh.apps.googleusercontent.com',
            responseType: 'id_token token',
            scope: 'openid email profile https://www.googleapis.com/auth/photoslibrary',
            triggerAuthorizationResultEvent: true,
            postLogoutRedirectUri: 'https://localhost:4200' + '/unauthorized',
            startCheckSession: false,
            silentRenew: false,
            silentRenewUrl: 'https://localhost:4200' + '/silent-renew.html',
            postLoginRoute: '/home',
            forbiddenRoute: '/forbidden',
            unauthorizedRoute: '/unauthorized',
            logLevel: LogLevel.Debug,
            historyCleanupOff: true,
        }
    })],
    exports: [AuthModule],


})
export class AuthConfigModule { }

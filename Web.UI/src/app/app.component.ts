/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { environment } from 'environments/environment';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
    constructor(public oidcSecurityService: OidcSecurityService, private router: Router) { }

    ngOnInit() {
        // eslint-disable-next-line no-debugger
        this.oidcSecurityService
            .checkAuth(null, environment.azureId)

            .subscribe(({ isAuthenticated }) => {

                if (!isAuthenticated) {
                    if ('/autologin' !== window.location.pathname) {
                        localStorage.setItem('redirect', JSON.stringify(window.location.pathname));
                        this.router.navigateByUrl('/autologin');
                    }
                }
                if (isAuthenticated) {
                    this.navigateToStoredEndpoint();
                }
            });
    }

    ngOnDestroy(): void { }

    login() {
        console.log('start login');
        this.oidcSecurityService.authorize();
        console.log('app component: ' + this.oidcSecurityService.getAccessToken());
    }

    refreshSession() {
        console.log('start refreshSession');
        this.oidcSecurityService.authorize();
    }

    logout() {
        console.log('start logoff');
        this.oidcSecurityService.logoff();
    }

    private navigateToStoredEndpoint() {
        const path = this.read('redirect');

        if (this.router.url === path) {
            return;
        }

        if (path.toString().includes('/unauthorized')) {
            this.router.navigateByUrl('/');
        } else {
            this.router.navigateByUrl(path);
        }
    }

    private read(key: string): any {
        const data = localStorage.getItem(key);
        if (data != null) {
            return JSON.parse(data);
        }

        return;
    }

    private write(key: string, value: any): void {
        localStorage.setItem(key, JSON.stringify(value));
    }
}

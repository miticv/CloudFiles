
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Component, OnInit } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { environment } from 'environments/environment';

@Component({
    selector: 'app-auto-component',
    templateUrl: './auto-login.component.html',
})
export class AutoLoginComponent implements OnInit {
    lang: any;

    constructor(public oidcSecurityService: OidcSecurityService) { }

    ngOnInit() {

        this.oidcSecurityService.checkAuth(null, environment.azureId).subscribe(() => {

            this.oidcSecurityService.authorize(environment.azureId);
        });
    }
}

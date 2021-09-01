import { environment } from 'environments/environment';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, CanLoad, Route, Router, RouterStateSnapshot, UrlSegment, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { OidcSecurityService } from 'angular-auth-oidc-client';

@Injectable({
    providedIn: 'root'
})
export class NoAuthGuard implements CanActivate, CanActivateChild, CanLoad {
    /**
     * Constructor
     */
    constructor(
        private _authService: OidcSecurityService,
        private _router: Router
    ) {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Can activate
     *
     * @param route
     * @param state
     */
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
        return this._check();
    }

    /**
     * Can activate child
     *
     * @param childRoute
     * @param state
     */
    canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this._check();
    }

    /**
     * Can load
     *
     * @param route
     * @param segments
     */
    canLoad(route: Route, segments: UrlSegment[]): Observable<boolean> | Promise<boolean> | boolean {
        return this._check();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Check the authenticated status
     *
     * @private
     */
    private _check(): Observable<boolean> {
        // Check the authentication status
        if (this._authService.checkAuth(environment.azureId)) {
            // Redirect to the root
            this._router.navigate(['']);

            // Prevent the access
            return of(false);
        }
        else {
            return of(true);
        }
    }
}

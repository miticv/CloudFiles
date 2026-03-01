import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { MultiAuthService } from './multi-auth.service';
import { AuthService } from 'app/core/services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanActivateChild {
    constructor(
        private multiAuthService: MultiAuthService,
        private authService: AuthService,
        private router: Router
    ) {}

    canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
        return this.checkAuth(state.url);
    }

    canActivateChild(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
        return this.checkAuth(state.url);
    }

    private checkAuth(url: string): Observable<boolean | UrlTree> {
        // First check: CloudFiles session (our app JWT)
        if (!this.authService.isLoggedIn()) {
            localStorage.setItem('redirect', JSON.stringify(window.location.pathname));
            return of(this.router.createUrlTree(['/sessions/login']));
        }

        // Connections page only requires JWT, not OIDC — it's where users set up OIDC
        if (url.startsWith('/connections')) {
            return of(true);
        }

        // Second check: at least one OIDC provider connected
        return this.multiAuthService.isAnyAuthenticated().pipe(
            map((isAuthenticated) => {
                if (isAuthenticated) {
                    return true;
                }
                localStorage.setItem('redirect', JSON.stringify(window.location.pathname));
                return this.router.createUrlTree(['/connections']);
            })
        );
    }
}

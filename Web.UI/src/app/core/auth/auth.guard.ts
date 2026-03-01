import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, UrlTree } from '@angular/router';
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

    canActivate(): Observable<boolean | UrlTree> {
        return this.checkAuth();
    }

    canActivateChild(): Observable<boolean | UrlTree> {
        return this.checkAuth();
    }

    private checkAuth(): Observable<boolean | UrlTree> {
        // First check: CloudFiles session (our app JWT)
        if (!this.authService.isLoggedIn()) {
            localStorage.setItem('redirect', JSON.stringify(window.location.pathname));
            return of(this.router.createUrlTree(['/sessions/login']));
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

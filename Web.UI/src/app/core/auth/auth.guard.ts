import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MultiAuthService } from './multi-auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanActivateChild {
    constructor(
        private multiAuthService: MultiAuthService,
        private router: Router
    ) {}

    canActivate(): Observable<boolean | UrlTree> {
        return this.checkAuth();
    }

    canActivateChild(): Observable<boolean | UrlTree> {
        return this.checkAuth();
    }

    private checkAuth(): Observable<boolean | UrlTree> {
        return this.multiAuthService.isAnyAuthenticated().pipe(
            map(isAuthenticated => {
                if (isAuthenticated) {
                    return true;
                }
                localStorage.setItem('redirect', JSON.stringify(window.location.pathname));
                return this.router.createUrlTree(['/sessions/signin']);
            })
        );
    }
}

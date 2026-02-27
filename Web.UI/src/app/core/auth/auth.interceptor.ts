import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { OidcSecurityService } from 'angular-auth-oidc-client';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(
        private oidcSecurityService: OidcSecurityService,
        private router: Router
    ) {}

    intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        const configId = this.getConfigIdForUrl(req.url);
        if (!configId) {
            return next.handle(req);
        }

        return this.oidcSecurityService.getAccessToken(configId).pipe(
            switchMap(token => {
                const newReq = token
                    ? req.clone({ headers: req.headers.set('Authorization', 'Bearer ' + token) })
                    : req;
                return next.handle(newReq);
            }),
            catchError((error) => {
                return throwError(() => error);
            })
        );
    }

    private getConfigIdForUrl(url: string): string | null {
        if (url.includes('/azure/files/')) {
            return 'azure-storage';
        }
        if (url.includes('/azure/')) {
            return 'azure';
        }
        if (url.includes('/google/')) {
            return 'google';
        }
        return null;
    }
}

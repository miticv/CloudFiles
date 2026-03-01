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

        // CloudFiles JWT (our own app token from localStorage)
        if (configId === 'cloudfiles') {
            const token = localStorage.getItem('cf_token');
            const newReq = token
                ? req.clone({ headers: req.headers.set('Authorization', 'Bearer ' + token) })
                : req;
            return next.handle(newReq).pipe(
                catchError((error) => {
                    if (error instanceof HttpErrorResponse && error.status === 401) {
                        console.warn('[Auth Interceptor] 401 from CloudFiles JWT — session expired:', req.url);
                        localStorage.removeItem('cf_token');
                        localStorage.removeItem('cf_user');
                        this.router.navigateByUrl('/sessions/login');
                    }
                    return throwError(() => error);
                })
            );
        }

        return this.oidcSecurityService.getAccessToken(configId).pipe(
            switchMap((token) => {
                if (!token) {
                    console.warn(`[Auth Interceptor] no token for "${configId}" — request may fail:`, req.url);
                }
                const newReq = token
                    ? req.clone({ headers: req.headers.set('Authorization', 'Bearer ' + token) })
                    : req;
                return next.handle(newReq);
            }),
            catchError((error) => {
                if (error instanceof HttpErrorResponse && error.status === 401) {
                    console.warn(`[Auth Interceptor] 401 from "${configId}" — token expired or invalid:`, req.url);
                    this.oidcSecurityService.logoffLocal(configId);
                    this.router.navigateByUrl('/connections');
                }
                return throwError(() => error);
            })
        );
    }

    private getConfigIdForUrl(url: string): string | null {
        // CloudFiles app auth routes
        if (url.includes('/manage/') || url.includes('/auth/me')) {
            return 'cloudfiles';
        }
        // Auth endpoints (login/register) don't need any token header
        if (url.includes('/auth/')) {
            return null;
        }
        if (url.includes('/azure/files/')) {
            return 'azure-storage';
        }
        if (url.includes('/azure/')) {
            return 'azure';
        }
        if (url.includes('/google/')) {
            return 'google';
        }
        if (url.includes('/process/')) {
            return 'google';
        }
        return null;
    }
}

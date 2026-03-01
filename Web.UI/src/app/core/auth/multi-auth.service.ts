import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, first, map, takeUntil } from 'rxjs';
import { OidcSecurityService, PublicEventsService, EventTypes } from 'angular-auth-oidc-client';

export interface ProviderStatus {
    configId: string;
    authenticated: boolean;
    userData: unknown;
    accessToken: string;
}

@Injectable({ providedIn: 'root' })
export class MultiAuthService implements OnDestroy {
    static readonly PROVIDERS = ['google', 'azure', 'azure-storage'] as const;
    private destroy$ = new Subject<void>();

    constructor(
        private oidcSecurityService: OidcSecurityService,
        private eventService: PublicEventsService,
        private router: Router
    ) {
        this.subscribeToAuthEvents();
        this.processAuthChain();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    getAccessToken(configId: string): Observable<string> {
        return this.oidcSecurityService.getAccessToken(configId);
    }

    login(configId: string): void {
        console.log(`[Auth] login initiated for "${configId}"`);
        // Azure needs separate tokens for management and storage APIs
        if (configId === 'azure') {
            localStorage.setItem('auth_chain', 'azure-storage');
        }
        this.oidcSecurityService.authorize(configId);
    }

    logout(configId: string): void {
        console.log(`[Auth] logout for "${configId}"`);
        this.oidcSecurityService.logoffLocal(configId);
    }

    logoutAll(): void {
        console.log('[Auth] logout all providers');
        this.oidcSecurityService.logoffLocalMultiple();
    }

    /** One-shot check: is any provider currently authenticated? */
    isAnyAuthenticated(): Observable<boolean> {
        return this.watchAuthStatus().pipe(
            first(),
            map(statuses => statuses.some(s => s.authenticated))
        );
    }

    /** One-shot: list of currently connected provider configIds. */
    getConnectedProviders(): Observable<string[]> {
        return this.watchAuthStatus().pipe(
            first(),
            map(statuses => statuses.filter(s => s.authenticated).map(s => s.configId))
        );
    }

    /** Reactive stream that emits whenever any provider's auth state changes. */
    watchAuthStatus(): Observable<ProviderStatus[]> {
        return this.oidcSecurityService.isAuthenticated$.pipe(
            map(result =>
                result.allConfigsAuthenticated.map(r => ({
                    configId: r.configId,
                    authenticated: r.isAuthenticated,
                    userData: null,
                    accessToken: '',
                }))
            )
        );
    }

    private subscribeToAuthEvents(): void {
        this.eventService.registerForEvents().pipe(
            takeUntil(this.destroy$)
        ).subscribe((event) => {
            switch (event.type) {
                case EventTypes.NewAuthenticationResult:
                    console.log('[Auth] new authentication result:', event.value);
                    break;
                case EventTypes.TokenExpired:
                    console.warn('[Auth] access token expired — silent renew should trigger');
                    break;
                case EventTypes.IdTokenExpired:
                    console.warn('[Auth] ID token expired');
                    break;
                case EventTypes.SilentRenewStarted:
                    console.log('[Auth] silent renew started');
                    break;
                case EventTypes.SilentRenewFailed:
                    console.error('[Auth] silent renew FAILED:', event.value);
                    this.handleSilentRenewFailure();
                    break;
                case EventTypes.CheckingAuthFinishedWithError:
                    console.error('[Auth] checking auth finished with error:', event.value);
                    break;
            }
        });
    }

    private processAuthChain(): void {
        const chain = localStorage.getItem('auth_chain');
        if (!chain) return;
        localStorage.removeItem('auth_chain');

        this.oidcSecurityService.getAccessToken(chain).pipe(first()).subscribe((token) => {
            if (!token) {
                console.log(`[Auth] chaining auth for "${chain}"`);
                this.oidcSecurityService.authorize(chain);
            }
        });
    }

    private handleSilentRenewFailure(): void {
        // When refresh fails (e.g. refresh token revoked or missing), clear local state
        // and redirect to connections so the user can re-authenticate with a fresh consent.
        console.warn('[Auth] clearing local auth state and redirecting to connections');
        this.oidcSecurityService.logoffLocalMultiple();
        this.router.navigateByUrl('/sessions/signin');
    }
}

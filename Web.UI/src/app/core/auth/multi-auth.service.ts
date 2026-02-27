import { Injectable } from '@angular/core';
import { Observable, first, map } from 'rxjs';
import { OidcSecurityService } from 'angular-auth-oidc-client';

export interface ProviderStatus {
    configId: string;
    authenticated: boolean;
    userData: unknown;
    accessToken: string;
}

@Injectable({ providedIn: 'root' })
export class MultiAuthService {
    static readonly PROVIDERS = ['google', 'azure', 'azure-storage'] as const;

    constructor(private oidcSecurityService: OidcSecurityService) {}

    getAccessToken(configId: string): Observable<string> {
        return this.oidcSecurityService.getAccessToken(configId);
    }

    login(configId: string): void {
        this.oidcSecurityService.authorize(configId);
    }

    logout(configId: string): void {
        this.oidcSecurityService.logoffLocal(configId);
    }

    logoutAll(): void {
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
}

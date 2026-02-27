import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { MultiAuthService, ProviderStatus } from 'app/core/auth/multi-auth.service';
import { appAnimations } from 'app/shared/animations/animations';

@Component({
    selector: 'app-signin',
    templateUrl: './signin.component.html',
    styleUrls: ['./signin.component.scss'],
    animations: appAnimations,
    standalone: false
})
export class SigninComponent implements OnInit, OnDestroy {
    providers: ProviderStatus[] = [];
    private destroy$ = new Subject<void>();

    constructor(
        private multiAuthService: MultiAuthService
    ) {}

    ngOnInit() {
        // Reactive stream from isAuthenticated$ — always has the latest auth state
        // (OIDC callback is already processed by withAppInitializerAuthCheck before routing)
        this.multiAuthService.watchAuthStatus()
            .pipe(takeUntil(this.destroy$))
            .subscribe((statuses) => {
                this.providers = statuses;
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    connect(configId: string) {
        localStorage.setItem('redirect', JSON.stringify('/sessions/signin'));
        this.multiAuthService.login(configId);
    }

    disconnect(configId: string) {
        this.multiAuthService.logout(configId);
    }

    isConnected(configId: string): boolean {
        return this.providers.some(p => p.configId === configId && p.authenticated);
    }

    hasAnyConnection(): boolean {
        return this.providers.some(p => p.authenticated);
    }

    getProviderLabel(configId: string): string {
        switch (configId) {
            case 'google': return 'Google';
            case 'azure': return 'Microsoft Azure';
            default: return configId;
        }
    }

    getProviderIcon(configId: string): string {
        switch (configId) {
            case 'google': return 'eg_google';
            case 'azure': return 'business';
            default: return 'login';
        }
    }
}

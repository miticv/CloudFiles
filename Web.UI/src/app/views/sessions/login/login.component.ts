import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, first, takeUntil } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { appAnimations } from 'app/shared/animations/animations';
import { AuthService } from 'app/core/services/auth.service';
import { MultiAuthService } from 'app/core/auth/multi-auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule
    ],
    animations: appAnimations,
    templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit, OnDestroy {
    mode: 'login' | 'register' = 'login';
    loading = false;
    error = '';
    success = '';

    // Login form
    loginEmail = '';
    loginPassword = '';

    // Register form
    registerEmail = '';
    registerDisplayName = '';
    registerPassword = '';
    registerConfirmPassword = '';

    private destroy$ = new Subject<void>();

    constructor(
        private authService: AuthService,
        private multiAuthService: MultiAuthService,
        private router: Router
    ) {}

    ngOnInit() {
        // If already logged in with CloudFiles JWT, go to connections
        if (this.authService.isLoggedIn()) {
            this.router.navigateByUrl('/connections');
            return;
        }

        // Check if returning from OAuth redirect
        const pendingProvider = this.authService.getOAuthPending();
        if (pendingProvider) {
            this.handleOAuthReturn(pendingProvider);
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loginWithGoogle() {
        this.authService.setOAuthPending('google');
        localStorage.setItem('redirect', JSON.stringify('/sessions/login'));
        this.multiAuthService.login('google');
    }

    loginWithAzure() {
        this.authService.setOAuthPending('azure');
        localStorage.setItem('redirect', JSON.stringify('/sessions/login'));
        this.multiAuthService.login('azure');
    }

    loginLocal() {
        if (!this.loginEmail || !this.loginPassword) {
            this.error = 'Please enter your email and password.';
            return;
        }
        this.loading = true;
        this.error = '';

        this.authService.localLogin(this.loginEmail, this.loginPassword)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.loading = false;
                    this.router.navigateByUrl('/connections');
                },
                error: (err) => {
                    this.loading = false;
                    this.error = err.status === 401 ? 'Invalid email or password.' :
                                 err.status === 403 ? 'Account is not active or approved.' :
                                 'Login failed. Please try again.';
                }
            });
    }

    register() {
        if (!this.registerEmail || !this.registerDisplayName || !this.registerPassword) {
            this.error = 'Please fill in all fields.';
            return;
        }
        if (this.registerPassword !== this.registerConfirmPassword) {
            this.error = 'Passwords do not match.';
            return;
        }
        if (this.registerPassword.length < 6) {
            this.error = 'Password must be at least 6 characters.';
            return;
        }
        this.loading = true;
        this.error = '';

        this.authService.localRegister(this.registerEmail, this.registerDisplayName, this.registerPassword)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.loading = false;
                    this.router.navigateByUrl('/connections');
                },
                error: (err) => {
                    this.loading = false;
                    this.error = err.status === 409 ? 'An account with this email already exists.' :
                                 err.error?.error || 'Registration failed. Please try again.';
                }
            });
    }

    switchMode(mode: 'login' | 'register') {
        this.mode = mode;
        this.error = '';
        this.success = '';
    }

    private handleOAuthReturn(provider: string) {
        this.loading = true;
        this.error = '';

        // Wait for OIDC state to be ready
        this.multiAuthService.watchAuthStatus()
            .pipe(first(), takeUntil(this.destroy$))
            .subscribe((statuses) => {
                const configId = provider === 'azure' ? 'azure' : 'google';
                const providerStatus = statuses.find(s => s.configId === configId && s.authenticated);

                if (providerStatus) {
                    // Get the access token and call our backend
                    this.multiAuthService.getAccessToken(configId)
                        .pipe(first(), takeUntil(this.destroy$))
                        .subscribe((token) => {
                            if (token) {
                                this.authService.oauthLogin(token, provider)
                                    .pipe(takeUntil(this.destroy$))
                                    .subscribe({
                                        next: () => {
                                            this.loading = false;
                                            this.authService.clearOAuthPending();
                                            this.router.navigateByUrl('/connections');
                                        },
                                        error: (err) => {
                                            this.loading = false;
                                            this.authService.clearOAuthPending();
                                            this.error = err.status === 403 ? 'Account is not active or approved.' :
                                                         'OAuth login failed. Please try again.';
                                        }
                                    });
                            } else {
                                this.loading = false;
                                this.authService.clearOAuthPending();
                                this.error = 'Could not retrieve access token. Please try again.';
                            }
                        });
                } else {
                    // OAuth redirect didn't complete (user cancelled or error)
                    this.loading = false;
                    this.authService.clearOAuthPending();
                }
            });
    }
}

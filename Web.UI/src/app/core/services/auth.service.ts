import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HttpService } from './http.service';

export interface AuthUser {
    email: string;
    displayName: string;
    authProvider: string;
    isAdmin: boolean;
}

export interface AuthResponse {
    token: string;
    email: string;
    displayName: string;
    authProvider: string;
    isAdmin: boolean;
}

const CF_TOKEN_KEY = 'cf_token';
const CF_USER_KEY = 'cf_user';
const CF_OAUTH_PENDING_KEY = 'cf_oauth_pending';

@Injectable({ providedIn: 'root' })
export class AuthService extends HttpService {
    private currentUser$ = new BehaviorSubject<AuthUser | null>(this.loadUserFromStorage());
    readonly user$ = this.currentUser$.asObservable();

    constructor(http: HttpClient) {
        super(http);
    }

    oauthLogin(accessToken: string, provider: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.baseUrl}auth/oauth/login`, { accessToken, provider }).pipe(
            tap(response => this.saveSession(response))
        );
    }

    localLogin(email: string, password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.baseUrl}auth/local/login`, { email, password }).pipe(
            tap(response => this.saveSession(response))
        );
    }

    localRegister(email: string, displayName: string, password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.baseUrl}auth/local/register`, { email, displayName, password }).pipe(
            tap(response => this.saveSession(response))
        );
    }

    saveSession(response: AuthResponse): void {
        localStorage.setItem(CF_TOKEN_KEY, response.token);
        const user: AuthUser = {
            email: response.email,
            displayName: response.displayName,
            authProvider: response.authProvider,
            isAdmin: response.isAdmin
        };
        localStorage.setItem(CF_USER_KEY, JSON.stringify(user));
        this.currentUser$.next(user);
    }

    clearSession(): void {
        localStorage.removeItem(CF_TOKEN_KEY);
        localStorage.removeItem(CF_USER_KEY);
        localStorage.removeItem(CF_OAUTH_PENDING_KEY);
        this.currentUser$.next(null);
    }

    getToken(): string | null {
        return localStorage.getItem(CF_TOKEN_KEY);
    }

    isLoggedIn(): boolean {
        return !!this.getToken();
    }

    isAdmin(): boolean {
        return this.currentUser$.value?.isAdmin ?? false;
    }

    getUser(): AuthUser | null {
        return this.currentUser$.value;
    }

    setOAuthPending(provider: string): void {
        localStorage.setItem(CF_OAUTH_PENDING_KEY, provider);
    }

    getOAuthPending(): string | null {
        return localStorage.getItem(CF_OAUTH_PENDING_KEY);
    }

    clearOAuthPending(): void {
        localStorage.removeItem(CF_OAUTH_PENDING_KEY);
    }

    private loadUserFromStorage(): AuthUser | null {
        const data = localStorage.getItem(CF_USER_KEY);
        if (data) {
            try {
                return JSON.parse(data);
            } catch {
                return null;
            }
        }
        return null;
    }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { first } from 'rxjs';
import { GooglePhotosService, PickedMediaItem, PickingSession } from 'app/core/services/google-photos.service';
import { MultiAuthService } from 'app/core/auth/multi-auth.service';

@Component({
    standalone: false,
    selector: 'app-google-photos',
    templateUrl: './google-photos.component.html',
    styleUrls: ['./google-photos.component.scss']
})
export class GooglePhotosComponent implements OnInit, OnDestroy {
    isGoogleConnected = false;
    loading = false;
    polling = false;
    error: string | null = null;

    pickedItems: PickedMediaItem[] = [];
    private activeSessionId: string | null = null;
    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private pickerWindow: Window | null = null;

    constructor(
        private googlePhotosService: GooglePhotosService,
        private multiAuthService: MultiAuthService,
        private http: HttpClient
    ) {}

    ngOnInit(): void {
        this.multiAuthService.watchAuthStatus().pipe(first()).subscribe((providers) => {
            const google = providers.find(p => p.configId === 'google');
            this.isGoogleConnected = google?.authenticated ?? false;
            if (this.isGoogleConnected && this.pickedItems.length === 0) {
                const saved = sessionStorage.getItem('googlePhotosPickedItems');
                if (saved) {
                    try { this.pickedItems = JSON.parse(saved); } catch { /* ignore */ }
                }
            }
        });
    }

    ngOnDestroy(): void {
        this.stopPolling();
    }

    connectGoogle(): void {
        this.multiAuthService.login('google');
    }

    selectPhotos(): void {
        this.loading = true;
        this.error = null;

        this.googlePhotosService.createSession().subscribe({
            next: (session) => {
                this.activeSessionId = session.id;
                this.loading = false;
                this.polling = true;

                // Open picker in new window with autoclose
                const pickerUrl = session.pickerUri.endsWith('/')
                    ? session.pickerUri + 'autoclose'
                    : session.pickerUri + '/autoclose';
                this.pickerWindow = window.open(pickerUrl, '_blank');

                // Parse poll interval from duration string (e.g. "5s" → 5000ms)
                const intervalMs = this.parseDuration(session.pollingConfig?.pollInterval) || 5000;
                this.startPolling(session.id, intervalMs);
            },
            error: (err) => {
                this.error = this.extractError(err, 'Failed to create picker session');
                this.loading = false;
            }
        });
    }

    viewPhoto(item: PickedMediaItem): void {
        const url = this.googlePhotosService.getImageProxyUrl(item.mediaFile.baseUrl, 1920, 1080);
        this.http.get(url, { responseType: 'blob' }).subscribe({
            next: (blob) => {
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, '_blank');
            }
        });
    }

    getThumbUrl(item: PickedMediaItem): string {
        return this.googlePhotosService.getImageProxyUrl(item.mediaFile.baseUrl, 300, 300);
    }

    private startPolling(sessionId: string, intervalMs: number): void {
        this.stopPolling();
        this.pollTimer = setInterval(() => {
            // If picker window was closed by user without selecting, stop polling
            if (this.pickerWindow && this.pickerWindow.closed) {
                this.checkSessionAndStop(sessionId);
                return;
            }

            this.googlePhotosService.pollSession(sessionId).subscribe({
                next: (session) => {
                    if (session.mediaItemsSet) {
                        this.stopPolling();
                        this.loadPickedItems(sessionId);
                    }
                },
                error: (err) => {
                    this.stopPolling();
                    this.error = this.extractError(err, 'Error polling session');
                    this.polling = false;
                }
            });
        }, intervalMs);
    }

    private checkSessionAndStop(sessionId: string): void {
        this.stopPolling();
        // Do one final check in case user selected items before closing
        this.googlePhotosService.pollSession(sessionId).subscribe({
            next: (session) => {
                if (session.mediaItemsSet) {
                    this.loadPickedItems(sessionId);
                } else {
                    this.polling = false;
                }
            },
            error: () => {
                this.polling = false;
            }
        });
    }

    private loadPickedItems(sessionId: string): void {
        this.loading = true;
        this.polling = false;

        this.googlePhotosService.listPickedItems(sessionId).subscribe({
            next: (items) => {
                this.pickedItems = items;
                this.loading = false;
                sessionStorage.setItem('googlePhotosPickedItems', JSON.stringify(items));
                // Clean up session
                this.googlePhotosService.deleteSession(sessionId).subscribe();
                this.activeSessionId = null;
            },
            error: (err) => {
                this.error = this.extractError(err, 'Failed to load selected photos');
                this.loading = false;
            }
        });
    }

    private stopPolling(): void {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    private parseDuration(duration: string | undefined): number | null {
        if (!duration) return null;
        // Parse Go-style duration like "5s", "10s"
        const match = duration.match(/^(\d+)s$/);
        return match ? parseInt(match[1], 10) * 1000 : null;
    }

    private extractError(error: unknown, fallback: string): string {
        if (error instanceof HttpErrorResponse) {
            if (error.error?.message) return error.error.message;
            if (typeof error.error === 'string' && error.error) return error.error;
            if (error.status === 0) return 'Could not reach the server. Is the backend running?';
            if (error.status === 401) return 'Authentication failed. Please sign in again.';
            return `${fallback} (HTTP ${error.status})`;
        }
        return fallback;
    }
}

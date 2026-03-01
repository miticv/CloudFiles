import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { first } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { GoogleDriveService, GoogleDriveFile } from 'app/core/services/google-drive.service';
import { MultiAuthService } from 'app/core/auth/multi-auth.service';
import {
    CopyDriveToAzureDialogComponent,
    CopyDriveToAzureDialogData
} from './copy-drive-to-azure-dialog/copy-drive-to-azure-dialog.component';

interface BreadcrumbEntry {
    id: string;
    name: string;
}

@Component({
    standalone: false,
    selector: 'app-google-drive',
    templateUrl: './google-drive.component.html',
    styleUrls: ['./google-drive.component.scss']
})
export class GoogleDriveComponent implements OnInit {
    isGoogleConnected = false;
    loading = false;
    error: string | null = null;

    files: GoogleDriveFile[] = [];
    selectedFiles = new Set<string>();
    breadcrumbs: BreadcrumbEntry[] = [];
    currentFolderId = 'root';
    nextPageToken: string | null = null;

    constructor(
        private googleDriveService: GoogleDriveService,
        private multiAuthService: MultiAuthService,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.multiAuthService.watchAuthStatus().pipe(first()).subscribe((providers) => {
            const google = providers.find(p => p.configId === 'google');
            this.isGoogleConnected = google?.authenticated ?? false;
            if (this.isGoogleConnected) {
                this.loadFiles();
            }
        });
    }

    connectGoogle(): void {
        this.multiAuthService.login('google');
    }

    loadFiles(folderId?: string, append = false): void {
        if (!append) {
            this.loading = true;
            this.error = null;
            this.files = [];
            this.nextPageToken = null;
        }
        const id = folderId || this.currentFolderId;
        const pageToken = append ? (this.nextPageToken ?? undefined) : undefined;

        this.googleDriveService.listFiles(id, pageToken).subscribe({
            next: (response) => {
                if (append) {
                    this.files = [...this.files, ...response.files];
                } else {
                    this.files = response.files;
                }
                this.nextPageToken = response.nextPageToken;
                this.loading = false;
            },
            error: (err) => {
                this.error = this.extractError(err, 'Failed to load files');
                this.loading = false;
            }
        });
    }

    loadMore(): void {
        if (this.nextPageToken) {
            this.loadFiles(this.currentFolderId, true);
        }
    }

    navigateToFolder(file: GoogleDriveFile): void {
        this.breadcrumbs = [...this.breadcrumbs, { id: file.id, name: file.name }];
        this.currentFolderId = file.id;
        this.selectedFiles.clear();
        this.loadFiles();
    }

    navigateToBreadcrumb(index: number): void {
        if (index < 0) {
            this.breadcrumbs = [];
            this.currentFolderId = 'root';
        } else {
            this.currentFolderId = this.breadcrumbs[index].id;
            this.breadcrumbs = this.breadcrumbs.slice(0, index + 1);
        }
        this.selectedFiles.clear();
        this.loadFiles();
    }

    refresh(): void {
        this.selectedFiles.clear();
        this.loadFiles();
    }

    // --- Selection ---

    get folders(): GoogleDriveFile[] {
        return this.files.filter(f => f.isFolder);
    }

    get selectableFiles(): GoogleDriveFile[] {
        return this.files.filter(f => !f.isFolder && !f.mimeType.startsWith('application/vnd.google-apps.'));
    }

    get nonSelectableFiles(): GoogleDriveFile[] {
        return this.files.filter(f => !f.isFolder && f.mimeType.startsWith('application/vnd.google-apps.'));
    }

    toggleSelection(file: GoogleDriveFile): void {
        if (this.selectedFiles.has(file.id)) {
            this.selectedFiles.delete(file.id);
        } else {
            this.selectedFiles.add(file.id);
        }
    }

    isSelected(file: GoogleDriveFile): boolean {
        return this.selectedFiles.has(file.id);
    }

    get allSelectableSelected(): boolean {
        return this.selectableFiles.length > 0 && this.selectableFiles.every(f => this.selectedFiles.has(f.id));
    }

    toggleSelectAll(): void {
        if (this.allSelectableSelected) {
            this.selectableFiles.forEach(f => this.selectedFiles.delete(f.id));
        } else {
            this.selectableFiles.forEach(f => this.selectedFiles.add(f.id));
        }
    }

    get selectedFilesList(): GoogleDriveFile[] {
        return this.files.filter(f => this.selectedFiles.has(f.id));
    }

    // --- Copy to Azure ---

    openCopyToAzure(): void {
        const data: CopyDriveToAzureDialogData = {
            selectedFiles: this.selectedFilesList
        };
        this.dialog.open(CopyDriveToAzureDialogComponent, {
            width: '520px',
            data
        });
    }

    // --- Helpers ---

    getFileIcon(file: GoogleDriveFile): string {
        if (file.isFolder) return 'folder';
        const mime = file.mimeType;
        if (mime.startsWith('image/')) return 'image';
        if (mime.startsWith('video/')) return 'videocam';
        if (mime.startsWith('audio/')) return 'audiotrack';
        if (mime === 'application/pdf') return 'picture_as_pdf';
        if (mime.includes('zip') || mime.includes('archive') || mime.includes('tar')) return 'folder_zip';
        if (mime.includes('spreadsheet') || mime.includes('excel')) return 'table_chart';
        if (mime.includes('document') || mime.includes('word')) return 'article';
        if (mime.includes('presentation') || mime.includes('powerpoint')) return 'slideshow';
        return 'description';
    }

    getFileTypeBg(file: GoogleDriveFile): string {
        const mime = file.mimeType;
        if (mime.startsWith('image/')) return 'bg-amber-600';
        if (mime.startsWith('video/')) return 'bg-purple-600';
        if (mime.startsWith('audio/')) return 'bg-pink-600';
        if (mime === 'application/pdf') return 'bg-red-600';
        if (mime.includes('zip') || mime.includes('archive')) return 'bg-orange-600';
        if (mime.startsWith('application/vnd.google-apps.')) return 'bg-gray-400';
        return 'bg-teal-600';
    }

    getFileTypeLabel(file: GoogleDriveFile): string {
        const mime = file.mimeType;
        if (mime === 'application/vnd.google-apps.document') return 'DOC';
        if (mime === 'application/vnd.google-apps.spreadsheet') return 'SHEET';
        if (mime === 'application/vnd.google-apps.presentation') return 'SLIDE';
        if (mime === 'application/vnd.google-apps.form') return 'FORM';
        const ext = file.name.split('.').pop()?.toUpperCase();
        return ext && ext.length <= 5 ? ext : mime.split('/').pop()?.toUpperCase()?.slice(0, 5) || 'FILE';
    }

    formatSize(size: number | null): string {
        if (size == null) return '';
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
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

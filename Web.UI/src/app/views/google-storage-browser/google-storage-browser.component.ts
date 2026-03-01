import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { first } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { GoogleStorageService, GoogleBucketItem } from 'app/core/services/google-storage.service';
import { MultiAuthService } from 'app/core/auth/multi-auth.service';
import { FileItem } from 'app/views/file-manager/model/FileItem';
import {
    CopyGcsToAzureDialogComponent,
    CopyGcsToAzureDialogData
} from './copy-gcs-to-azure-dialog/copy-gcs-to-azure-dialog.component';

type ViewState = 'setup' | 'buckets' | 'browse';

interface StorageConfig {
    bucket?: string;
    projectId?: string;
}

@Component({
    standalone: false,
    selector: 'app-google-storage-browser',
    templateUrl: './google-storage-browser.component.html',
    styleUrls: ['./google-storage-browser.component.scss']
})
export class GoogleStorageBrowserComponent implements OnInit {
    isGoogleConnected = false;
    loading = false;
    error: string | null = null;
    currentView: ViewState = 'setup';

    // Setup inputs
    bucketInput = '';
    projectInput = '';

    // Bucket list
    buckets: GoogleBucketItem[] = [];

    // Browse state
    currentBucket = '';
    items: FileItem[] = [];
    currentPath: string[] = [];

    private readonly storageKey = 'googleStorageConfig';

    selectedFiles = new Set<string>();

    constructor(
        private googleStorageService: GoogleStorageService,
        private multiAuthService: MultiAuthService,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.multiAuthService.watchAuthStatus().pipe(first()).subscribe((providers) => {
            const google = providers.find(p => p.configId === 'google');
            this.isGoogleConnected = google?.authenticated ?? false;
            if (this.isGoogleConnected) {
                this.restoreConfig();
            }
        });
    }

    connectGoogle(): void {
        this.multiAuthService.login('google');
    }

    // --- Setup ---

    browseBucket(bucket?: string): void {
        const name = (bucket || this.bucketInput).trim();
        if (!name) return;
        this.currentBucket = name;
        this.currentPath = [];
        this.saveConfig({ bucket: name, projectId: this.projectInput });
        this.loadFiles();
    }

    findBuckets(): void {
        const projectId = this.projectInput.trim();
        if (!projectId) return;
        this.loading = true;
        this.error = null;
        this.saveConfig({ bucket: this.bucketInput, projectId });

        this.googleStorageService.listBuckets(projectId).subscribe({
            next: (data) => {
                this.buckets = data;
                this.currentView = 'buckets';
                this.loading = false;
            },
            error: (err) => {
                this.error = this.extractError(err, 'Failed to list buckets');
                this.loading = false;
            }
        });
    }

    selectBucket(bucket: GoogleBucketItem): void {
        this.bucketInput = bucket.name;
        this.browseBucket(bucket.name);
    }

    // --- Browse ---

    loadFiles(path?: string): void {
        this.loading = true;
        this.error = null;
        this.currentView = 'browse';

        this.googleStorageService.listFiles(this.currentBucket, path).subscribe({
            next: (data) => {
                this.items = data;
                this.loading = false;
            },
            error: (err) => {
                this.error = this.extractError(err, 'Failed to load files');
                this.loading = false;
            }
        });
    }

    navigateToFolder(folder: FileItem): void {
        this.currentPath = folder.itemPath.split('/').filter(x => x);
        this.selectedFiles.clear();
        this.loadFiles(folder.itemPath);
    }

    navigateToBreadcrumb(index: number): void {
        this.selectedFiles.clear();
        if (index < 0) {
            this.currentPath = [];
            this.loadFiles();
            return;
        }
        this.currentPath = this.currentPath.slice(0, index + 1);
        const path = this.currentPath.join('/') + '/';
        this.loadFiles(path);
    }

    backToSetup(): void {
        this.currentView = 'setup';
        this.items = [];
        this.currentPath = [];
        this.error = null;
    }

    backToBuckets(): void {
        this.currentView = 'buckets';
        this.items = [];
        this.currentPath = [];
        this.error = null;
    }

    refresh(): void {
        this.selectedFiles.clear();
        if (this.currentView === 'browse') {
            const path = this.currentPath.length > 0
                ? this.currentPath.join('/') + '/'
                : undefined;
            this.loadFiles(path);
        } else if (this.currentView === 'buckets') {
            this.findBuckets();
        }
    }

    get folders(): FileItem[] {
        return this.items.filter(i => i.isFolder);
    }

    get files(): FileItem[] {
        return this.items.filter(i => !i.isFolder);
    }

    // --- Selection ---

    toggleSelection(file: FileItem): void {
        if (this.selectedFiles.has(file.itemPath)) {
            this.selectedFiles.delete(file.itemPath);
        } else {
            this.selectedFiles.add(file.itemPath);
        }
    }

    isSelected(file: FileItem): boolean {
        return this.selectedFiles.has(file.itemPath);
    }

    get allSelected(): boolean {
        return this.files.length > 0 && this.files.every(f => this.selectedFiles.has(f.itemPath));
    }

    toggleSelectAll(): void {
        if (this.allSelected) {
            this.files.forEach(f => this.selectedFiles.delete(f.itemPath));
        } else {
            this.files.forEach(f => this.selectedFiles.add(f.itemPath));
        }
    }

    get selectedFilesList(): FileItem[] {
        return this.files.filter(f => this.selectedFiles.has(f.itemPath));
    }

    // --- Copy to Azure ---

    openCopyToAzure(): void {
        const data: CopyGcsToAzureDialogData = {
            selectedFiles: this.selectedFilesList,
            bucketName: this.currentBucket
        };
        this.dialog.open(CopyGcsToAzureDialogComponent, {
            width: '520px',
            data
        });
    }

    getFileTypeBg(itemType: string): string {
        switch (itemType) {
            case 'JPG': case 'JPEG': case 'PNG': case 'GIF': case 'WEBP': case 'HEIC':
                return 'bg-amber-600';
            case 'MP4': case 'MOV': case 'AVI': case 'MKV':
                return 'bg-purple-600';
            case 'PDF':
                return 'bg-red-600';
            default:
                return 'bg-teal-600';
        }
    }

    // --- Persistence ---

    private saveConfig(config: StorageConfig): void {
        localStorage.setItem(this.storageKey, JSON.stringify(config));
    }

    private restoreConfig(): void {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return;
        try {
            const config: StorageConfig = JSON.parse(raw);
            this.bucketInput = config.bucket || '';
            this.projectInput = config.projectId || '';
        } catch {
            localStorage.removeItem(this.storageKey);
        }
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

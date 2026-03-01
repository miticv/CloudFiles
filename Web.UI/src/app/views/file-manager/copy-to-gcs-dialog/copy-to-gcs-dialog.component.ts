import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { forkJoin } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { FileItem } from '../model/FileItem';
import { ProcessService } from 'app/core/services/process.service';
import { GoogleStorageService, GoogleBucketItem } from 'app/core/services/google-storage.service';
import { MultiAuthService } from 'app/core/auth/multi-auth.service';
import { first } from 'rxjs';

export interface CopyToGcsDialogData {
    selectedFiles: FileItem[];
    selectedFolders: FileItem[];
    account: string;
    container: string;
}

@Component({
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatDialogModule, MatIconModule, MatButtonModule,
        MatSelectModule, MatFormFieldModule, MatInputModule,
        MatProgressSpinnerModule, MatTooltipModule
    ],
    selector: 'app-copy-to-gcs-dialog',
    styles: [`
        :host { display: block; min-width: 420px; }
    `],
    template: `
        <h2 mat-dialog-title class="flex items-center gap-2">
            <mat-icon>cloud_upload</mat-icon>
            Copy to Google Cloud Storage
        </h2>

        <mat-dialog-content>
            <!-- Not connected -->
            <div *ngIf="!isGoogleConnected" class="py-6 text-center">
                <mat-icon class="text-gray-300" style="font-size: 48px; width: 48px; height: 48px;">
                    cloud_off
                </mat-icon>
                <div class="mt-3 text-lg font-semibold">Google Not Connected</div>
                <div class="mt-2 text-sm text-secondary">
                    Connect your Google account on the Connections page to use Google Cloud Storage.
                </div>
            </div>

            <!-- Success state -->
            <div *ngIf="isGoogleConnected && success" class="py-6 text-center">
                <mat-icon class="text-green-500" style="font-size: 48px; width: 48px; height: 48px;">
                    check_circle
                </mat-icon>
                <div class="mt-3 text-lg font-semibold">Copy started!</div>
                <div class="mt-1 text-sm text-secondary">Instance: {{instanceId}}</div>
            </div>

            <!-- Form state -->
            <ng-container *ngIf="isGoogleConnected && !success">
                <!-- Summary -->
                <div class="mb-5 p-3 rounded-lg text-sm" style="background: #e8f5e9;">
                    <div class="flex items-center gap-2">
                        <mat-icon style="font-size: 18px; width: 18px; height: 18px; color: #2e7d32;">
                            storage
                        </mat-icon>
                        <span>
                            <strong>{{data.selectedFiles.length}}</strong>
                            file{{data.selectedFiles.length !== 1 ? 's' : ''}}
                            <span *ngIf="data.selectedFolders.length > 0">
                                and <strong>{{data.selectedFolders.length}}</strong>
                                folder{{data.selectedFolders.length !== 1 ? 's' : ''}}
                            </span>
                            from <strong>{{data.container}}</strong>
                        </span>
                    </div>
                </div>

                <!-- GCS Destination -->
                <div class="text-sm font-semibold mb-2" style="color: #424242;">GCS Destination</div>

                <!-- Project ID -->
                <div class="flex items-center gap-3">
                    <mat-form-field appearance="outline" class="flex-1" subscriptSizing="dynamic">
                        <mat-label>Google Cloud Project ID</mat-label>
                        <input matInput [(ngModel)]="projectId" placeholder="my-gcp-project"
                               (keydown.enter)="loadBuckets()">
                    </mat-form-field>
                    <button mat-flat-button color="primary" (click)="loadBuckets()"
                            [disabled]="!projectId.trim() || loadingBuckets">
                        {{loadingBuckets ? 'Loading...' : 'List Buckets'}}
                    </button>
                </div>

                <!-- Bucket -->
                <mat-form-field *ngIf="buckets.length > 0" appearance="outline"
                                class="w-full mt-3" subscriptSizing="dynamic">
                    <mat-label>Bucket</mat-label>
                    <mat-select [(ngModel)]="selectedBucket" (selectionChange)="onBucketChange()">
                        <mat-option *ngFor="let b of buckets" [value]="b.name">
                            {{b.name}}
                        </mat-option>
                    </mat-select>
                </mat-form-field>

                <!-- Destination folder -->
                <mat-form-field *ngIf="selectedBucket" appearance="outline"
                                class="w-full mt-3" subscriptSizing="dynamic">
                    <mat-label>Destination folder/prefix (optional)</mat-label>
                    <input matInput [(ngModel)]="destinationFolder"
                           (ngModelChange)="onDestinationFolderChange()" placeholder="azure-backup/2024">
                </mat-form-field>

                <!-- Error -->
                <div *ngIf="error" class="mt-4 p-3 rounded-lg text-sm flex items-center gap-2"
                     style="background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c;">
                    <mat-icon style="font-size: 18px; width: 18px; height: 18px;">error_outline</mat-icon>
                    {{error}}
                </div>
            </ng-container>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
            <ng-container *ngIf="success">
                <button mat-button (click)="close()">Close</button>
                <button mat-flat-button color="primary" (click)="goToProcesses()">View Processes</button>
            </ng-container>
            <ng-container *ngIf="!success">
                <button mat-button (click)="close()" [disabled]="submitting">Cancel</button>
                <button mat-flat-button color="primary" (click)="startCopy()"
                        [disabled]="!selectedBucket || submitting"
                        *ngIf="isGoogleConnected">
                    <mat-spinner *ngIf="submitting" diameter="18" class="mr-2 inline-block"></mat-spinner>
                    {{submitting ? 'Starting...' : 'Start Copy'}}
                </button>
            </ng-container>
        </mat-dialog-actions>
    `
})
export class CopyToGcsDialogComponent implements OnInit {
    isGoogleConnected = false;
    buckets: GoogleBucketItem[] = [];
    projectId = '';
    selectedBucket = '';
    destinationFolder = '';

    loadingBuckets = false;
    submitting = false;
    error: string | null = null;
    success = false;
    instanceId: string | null = null;
    private static STORAGE_KEY = 'copyToGcsState';

    constructor(
        private dialogRef: MatDialogRef<CopyToGcsDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: CopyToGcsDialogData,
        private googleStorageService: GoogleStorageService,
        private processService: ProcessService,
        private multiAuthService: MultiAuthService,
        private oidcSecurityService: OidcSecurityService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.multiAuthService.watchAuthStatus().pipe(first()).subscribe((providers) => {
            const google = providers.find(p => p.configId === 'google');
            this.isGoogleConnected = google?.authenticated ?? false;
            if (this.isGoogleConnected) {
                this.restoreState();
            }
        });
    }

    loadBuckets(): void {
        const pid = this.projectId.trim();
        if (!pid) return;
        this.loadingBuckets = true;
        this.error = null;
        this.saveState();

        this.googleStorageService.listBuckets(pid).subscribe({
            next: (data) => {
                this.buckets = data;
                this.loadingBuckets = false;
                if (this.buckets.length === 0) {
                    this.error = 'No buckets found in this project.';
                }
            },
            error: () => {
                this.error = 'Failed to list buckets. Check your project ID and Google connection.';
                this.loadingBuckets = false;
            }
        });
    }

    onBucketChange(): void {
        this.saveState();
    }

    onDestinationFolderChange(): void {
        this.saveState();
    }

    startCopy(): void {
        this.submitting = true;
        this.error = null;

        const selectedItems = [
            ...this.data.selectedFiles.map(f => ({ itemPath: f.itemPath, isFolder: false })),
            ...this.data.selectedFolders.map(f => ({ itemPath: f.itemPath, isFolder: true }))
        ];

        forkJoin({
            azureToken: this.oidcSecurityService.getAccessToken('azure-storage').pipe(take(1)),
            googleUser: this.oidcSecurityService.getUserData('google').pipe(take(1)),
            azureUser: this.oidcSecurityService.getUserData('azure').pipe(take(1))
        }).pipe(
            switchMap(({ azureToken, googleUser, azureUser }) => {
                const emails: { provider: string; email: string }[] = [];
                if (googleUser?.email) {
                    emails.push({ provider: 'google', email: googleUser.email });
                }
                if (azureUser?.preferred_username) {
                    emails.push({ provider: 'azure', email: azureUser.preferred_username });
                } else if (azureUser?.email) {
                    emails.push({ provider: 'azure', email: azureUser.email });
                }

                return this.processService.startAzureToGcs({
                    selectedItems,
                    accountName: this.data.account,
                    containerName: this.data.container,
                    bucketName: this.selectedBucket,
                    destinationFolder: this.destinationFolder.trim(),
                    startedBy: emails.map(e => `${e.provider}:${e.email}`).join('|')
                });
            })
        ).subscribe({
            next: (response) => {
                this.success = true;
                this.instanceId = response.id;
                this.submitting = false;
            },
            error: () => {
                this.error = 'Failed to start copy. Please try again.';
                this.submitting = false;
            }
        });
    }

    private saveState(): void {
        sessionStorage.setItem(CopyToGcsDialogComponent.STORAGE_KEY, JSON.stringify({
            projectId: this.projectId,
            selectedBucket: this.selectedBucket,
            destinationFolder: this.destinationFolder,
        }));
    }

    private restoreState(): void {
        const raw = sessionStorage.getItem(CopyToGcsDialogComponent.STORAGE_KEY);
        if (!raw) return;
        try {
            const saved = JSON.parse(raw);
            this.projectId = saved.projectId || '';
            this.selectedBucket = saved.selectedBucket || '';
            this.destinationFolder = saved.destinationFolder || '';
            if (this.projectId) {
                this.loadBuckets();
            }
        } catch { /* ignore */ }
    }

    goToProcesses(): void {
        this.dialogRef.close();
        this.router.navigate(['/processes']);
    }

    close(): void {
        this.dialogRef.close();
    }
}

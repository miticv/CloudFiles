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
import { Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { switchMap, take } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { GoogleAlbumService, GoogleAlbum } from 'app/core/services/google-album.service';
import { ProcessService, MigrationItem } from 'app/core/services/process.service';
import { FileItem } from '../model/FileItem';

export interface MigrateDialogData {
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
        MatProgressSpinnerModule
    ],
    selector: 'app-migrate-dialog',
    styles: [`
        :host { display: block; min-width: 420px; }
        .album-card {
            display: flex; align-items: center; gap: 12px;
            padding: 10px 14px; border: 1px solid #e0e0e0; border-radius: 8px;
            cursor: pointer; transition: all 0.15s;
        }
        .album-card:hover { border-color: #90caf9; background: #f5f9ff; }
        .album-card.selected { border-color: #1976d2; background: #e3f2fd; }
        .album-card .album-radio { color: #bdbdbd; }
        .album-card.selected .album-radio { color: #1976d2; }
    `],
    template: `
        <h2 mat-dialog-title class="flex items-center gap-2">
            <mat-icon>cloud_upload</mat-icon>
            Migrate to Google Photos
        </h2>

        <mat-dialog-content>
            <!-- Success state -->
            <div *ngIf="success" class="py-6 text-center">
                <mat-icon class="text-green-500" style="font-size: 48px; width: 48px; height: 48px;">check_circle</mat-icon>
                <div class="mt-3 text-lg font-semibold">Migration started!</div>
                <div class="mt-1 text-sm text-secondary">Instance: {{instanceId}}</div>
            </div>

            <!-- Form state -->
            <ng-container *ngIf="!success">
                <!-- Summary -->
                <div class="mb-5 p-3 rounded-lg text-sm" style="background: #e3f2fd;">
                    <div class="flex items-center gap-2">
                        <mat-icon style="font-size: 18px; width: 18px; height: 18px; color: #1976d2;">file_copy</mat-icon>
                        <span>
                            <strong>{{data.selectedFiles.length}}</strong> file{{data.selectedFiles.length !== 1 ? 's' : ''}}
                            <span *ngIf="data.selectedFolders.length > 0">
                                and <strong>{{data.selectedFolders.length}}</strong> folder{{data.selectedFolders.length !== 1 ? 's' : ''}}
                            </span>
                            selected for migration
                        </span>
                    </div>
                </div>

                <!-- Destination label -->
                <div class="text-sm font-semibold mb-3" style="color: #424242;">Destination Album</div>

                <!-- Loading -->
                <div *ngIf="loading" class="flex items-center justify-center gap-3 py-8 text-sm text-secondary">
                    <mat-spinner diameter="24"></mat-spinner>
                    Loading albums...
                </div>

                <ng-container *ngIf="!loading">
                    <!-- Existing albums as selectable cards -->
                    <div *ngIf="albums.length > 0" class="space-y-2 mb-3"
                         style="max-height: 200px; overflow-y: auto;">
                        <div *ngFor="let album of albums"
                             class="album-card"
                             [class.selected]="selectedAlbumId === album.id && !showNewAlbum"
                             (click)="selectedAlbumId = album.id; showNewAlbum = false">
                            <mat-icon class="album-radio">
                                {{selectedAlbumId === album.id && !showNewAlbum ? 'radio_button_checked' : 'radio_button_unchecked'}}
                            </mat-icon>
                            <div class="flex-1 min-w-0">
                                <div class="text-sm font-medium truncate">{{album.title}}</div>
                                <div class="text-xs" style="color: #9e9e9e;" *ngIf="album.mediaItemsCount">
                                    {{album.mediaItemsCount}} items
                                </div>
                            </div>
                            <mat-icon style="font-size: 18px; width: 18px; height: 18px; color: #bdbdbd;">photo_library</mat-icon>
                        </div>
                    </div>

                    <!-- Divider -->
                    <div *ngIf="albums.length > 0" class="flex items-center gap-3 my-3">
                        <div class="flex-1" style="height: 1px; background: #e0e0e0;"></div>
                        <span class="text-xs" style="color: #9e9e9e;">OR</span>
                        <div class="flex-1" style="height: 1px; background: #e0e0e0;"></div>
                    </div>

                    <!-- Create new album -->
                    <div [class.selected]="showNewAlbum"
                         [style.border-radius]="showNewAlbum ? '8px 8px 0 0' : '8px'"
                         [style.border-bottom]="showNewAlbum ? 'none' : ''"
                         class="album-card"
                         (click)="showNewAlbum = true">
                        <mat-icon class="album-radio">
                            {{showNewAlbum ? 'radio_button_checked' : 'radio_button_unchecked'}}
                        </mat-icon>
                        <div class="flex-1">
                            <div class="text-sm font-medium">Create new album</div>
                        </div>
                        <mat-icon style="font-size: 18px; width: 18px; height: 18px; color: #bdbdbd;">add_photo_alternate</mat-icon>
                    </div>

                    <!-- New album input (connected to the card above) -->
                    <div *ngIf="showNewAlbum"
                         style="border: 1px solid #1976d2; border-top: none; border-radius: 0 0 8px 8px; background: #e3f2fd; padding: 12px 14px;">
                        <div class="flex items-center gap-2">
                            <mat-form-field appearance="outline" class="flex-1" subscriptSizing="dynamic"
                                            style="--mdc-outlined-text-field-container-shape: 6px;">
                                <input matInput [(ngModel)]="newAlbumTitle" placeholder="Enter album name"
                                       [disabled]="creatingAlbum || submitting"
                                       (keydown.enter)="newAlbumTitle.trim() && createAlbum()">
                            </mat-form-field>
                            <button mat-flat-button color="primary"
                                    style="height: 48px; min-width: 48px; padding: 0 16px;"
                                    (click)="createAlbum()"
                                    [disabled]="!newAlbumTitle.trim() || creatingAlbum">
                                <mat-spinner *ngIf="creatingAlbum" diameter="20"></mat-spinner>
                                <span *ngIf="!creatingAlbum" class="flex items-center gap-1">
                                    <mat-icon>add</mat-icon> Create
                                </span>
                            </button>
                        </div>
                    </div>
                </ng-container>

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
                <button mat-flat-button color="primary" (click)="startMigration()"
                        [disabled]="!selectedAlbumId || submitting || (showNewAlbum && !selectedAlbumId)">
                    <mat-spinner *ngIf="submitting" diameter="18" class="mr-2 inline-block"></mat-spinner>
                    {{submitting ? 'Starting...' : 'Start Migration'}}
                </button>
            </ng-container>
        </mat-dialog-actions>
    `
})
export class MigrateDialogComponent implements OnInit {
    albums: GoogleAlbum[] = [];
    selectedAlbumId = '';
    newAlbumTitle = '';
    showNewAlbum = false;
    loading = false;
    creatingAlbum = false;
    submitting = false;
    error: string | null = null;
    success = false;
    instanceId: string | null = null;

    constructor(
        private dialogRef: MatDialogRef<MigrateDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: MigrateDialogData,
        private googleAlbumService: GoogleAlbumService,
        private processService: ProcessService,
        private oidcSecurityService: OidcSecurityService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.loadAlbums();
    }

    loadAlbums(): void {
        this.loading = true;
        this.googleAlbumService.listAlbums().subscribe({
            next: (albums) => {
                this.albums = albums;
                if (albums.length === 0) {
                    this.showNewAlbum = true;
                }
                this.loading = false;
            },
            error: () => {
                // Album listing may fail if no app-created albums exist yet; default to create
                this.showNewAlbum = true;
                this.loading = false;
            }
        });
    }

    createAlbum(): void {
        if (!this.newAlbumTitle.trim()) return;
        this.creatingAlbum = true;
        this.error = null;
        this.googleAlbumService.createAlbum(this.newAlbumTitle.trim()).subscribe({
            next: (album) => {
                this.albums.unshift(album);
                this.selectedAlbumId = album.id;
                this.showNewAlbum = false;
                this.newAlbumTitle = '';
                this.creatingAlbum = false;
            },
            error: (err) => {
                this.error = 'Failed to create album.';
                this.creatingAlbum = false;
            }
        });
    }

    startMigration(): void {
        this.submitting = true;
        this.error = null;
        const items: MigrationItem[] = [
            ...this.data.selectedFiles.map(f => ({ itemPath: f.itemPath, isFolder: false })),
            ...this.data.selectedFolders.map(f => ({ itemPath: f.itemPath, isFolder: true }))
        ];
        forkJoin({
            azureToken: this.oidcSecurityService.getAccessToken('azure-storage').pipe(take(1)),
            googleUser: this.oidcSecurityService.getUserData('google').pipe(take(1)),
            azureUser: this.oidcSecurityService.getUserData('azure').pipe(take(1))
        }).pipe(
            switchMap(({ azureToken, googleUser, azureUser }) => {
                const emails: string[] = [];
                if (googleUser?.email) emails.push(googleUser.email);
                if (azureUser?.preferred_username) emails.push(azureUser.preferred_username);
                else if (azureUser?.email) emails.push(azureUser.email);
                const album = this.albums.find(a => a.id === this.selectedAlbumId);
                return this.processService.startMigration({
                    albumId: this.selectedAlbumId,
                    albumTitle: album?.title || '',
                    selectedItemsList: items,
                    accountName: this.data.account,
                    containerName: this.data.container,
                    azureAccessToken: azureToken,
                    startedBy: emails.join(', ')
                });
            })
        ).subscribe({
            next: (response) => {
                this.success = true;
                this.instanceId = response.id;
                this.submitting = false;
            },
            error: (err) => {
                this.error = 'Failed to start migration. Please try again.';
                this.submitting = false;
            }
        });
    }

    goToProcesses(): void {
        this.dialogRef.close();
        this.router.navigate(['/processes']);
    }

    close(): void {
        this.dialogRef.close();
    }
}

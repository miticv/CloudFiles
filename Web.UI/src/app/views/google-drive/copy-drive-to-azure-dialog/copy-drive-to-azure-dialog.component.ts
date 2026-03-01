import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
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
import { GoogleDriveFile } from 'app/core/services/google-drive.service';
import { ProcessService } from 'app/core/services/process.service';
import {
    AzureBrowseService,
    AzureSubscription,
    AzureResourceGroup,
    AzureStorageAccount,
    AzureContainer
} from 'app/core/services/azure-browse.service';

export interface CopyDriveToAzureDialogData {
    selectedFiles: GoogleDriveFile[];
}

@Component({
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatDialogModule, MatIconModule, MatButtonModule,
        MatSelectModule, MatFormFieldModule, MatInputModule,
        MatProgressSpinnerModule, MatTooltipModule
    ],
    selector: 'app-copy-drive-to-azure-dialog',
    styles: [`
        :host { display: block; min-width: 420px; }
    `],
    template: `
        <h2 mat-dialog-title class="flex items-center gap-2">
            <mat-icon>cloud_download</mat-icon>
            Copy to Azure Storage
        </h2>

        <mat-dialog-content>
            <!-- Success state -->
            <div *ngIf="success" class="py-6 text-center">
                <mat-icon class="text-green-500" style="font-size: 48px; width: 48px; height: 48px;">
                    check_circle
                </mat-icon>
                <div class="mt-3 text-lg font-semibold">Copy started!</div>
                <div class="mt-1 text-sm text-secondary">Instance: {{instanceId}}</div>
            </div>

            <!-- Form state -->
            <ng-container *ngIf="!success">
                <!-- Summary -->
                <div class="mb-5 p-3 rounded-lg text-sm" style="background: #e3f2fd;">
                    <div class="flex items-center gap-2">
                        <mat-icon style="font-size: 18px; width: 18px; height: 18px; color: #1976d2;">
                            folder_shared
                        </mat-icon>
                        <span>
                            <strong>{{data.selectedFiles.length}}</strong>
                            file{{data.selectedFiles.length !== 1 ? 's' : ''}}
                            selected for copy
                            <span *ngIf="totalSize" class="text-secondary">({{formatSize(totalSize)}})</span>
                        </span>
                    </div>
                </div>

                <!-- Azure Destination -->
                <div class="text-sm font-semibold mb-2" style="color: #424242;">Azure Destination</div>

                <!-- Loading subscriptions -->
                <div *ngIf="loadingStep === 'subscriptions'"
                     class="flex items-center justify-center gap-3 py-8 text-sm text-secondary">
                    <mat-spinner diameter="24"></mat-spinner>
                    Loading subscriptions...
                </div>

                <ng-container *ngIf="loadingStep !== 'subscriptions'">
                    <!-- Subscription -->
                    <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                        <mat-label>Subscription</mat-label>
                        <mat-select [(ngModel)]="selectedSubscriptionId"
                                    (selectionChange)="onSubscriptionChange()">
                            <mat-option *ngFor="let sub of subscriptions" [value]="sub.subscriptionId">
                                {{sub.displayName}}
                            </mat-option>
                        </mat-select>
                    </mat-form-field>

                    <!-- Resource Group -->
                    <mat-form-field *ngIf="selectedSubscriptionId" appearance="outline"
                                    class="w-full mt-3" subscriptSizing="dynamic">
                        <mat-label>Resource Group</mat-label>
                        <mat-select [(ngModel)]="selectedResourceGroup"
                                    (selectionChange)="onResourceGroupChange()"
                                    [disabled]="loadingStep === 'resourceGroups'">
                            <mat-option *ngFor="let rg of resourceGroups" [value]="rg.name">
                                {{rg.name}}
                            </mat-option>
                        </mat-select>
                        <mat-hint *ngIf="loadingStep === 'resourceGroups'">Loading...</mat-hint>
                    </mat-form-field>

                    <!-- Storage Account -->
                    <mat-form-field *ngIf="selectedResourceGroup" appearance="outline"
                                    class="w-full mt-3" subscriptSizing="dynamic">
                        <mat-label>Storage Account</mat-label>
                        <mat-select [(ngModel)]="selectedAccountName"
                                    (selectionChange)="onAccountChange()"
                                    [disabled]="loadingStep === 'accounts'">
                            <mat-option *ngFor="let acc of storageAccounts" [value]="acc.name">
                                {{acc.name}}
                            </mat-option>
                        </mat-select>
                        <mat-hint *ngIf="loadingStep === 'accounts'">Loading...</mat-hint>
                    </mat-form-field>

                    <!-- Container -->
                    <mat-form-field *ngIf="selectedAccountName" appearance="outline"
                                    class="w-full mt-3" subscriptSizing="dynamic">
                        <mat-label>Container</mat-label>
                        <mat-select [(ngModel)]="selectedContainer"
                                    (selectionChange)="onContainerChange()"
                                    [disabled]="loadingStep === 'containers'">
                            <mat-option *ngFor="let c of containers" [value]="c.name">
                                {{c.name}}
                            </mat-option>
                        </mat-select>
                        <mat-hint *ngIf="loadingStep === 'containers'">Loading...</mat-hint>
                    </mat-form-field>

                    <!-- Checking role -->
                    <div *ngIf="selectedContainer && accessState === 'checking'"
                         class="mt-4 p-3 rounded-lg flex items-center gap-3 text-sm text-secondary"
                         style="background: #f8fafc; border: 1px solid #e2e8f0;">
                        <mat-spinner diameter="18"></mat-spinner>
                        Checking access...
                    </div>

                    <!-- No role -->
                    <div *ngIf="selectedContainer && accessState === 'no-role'"
                         class="mt-4 p-3 rounded-lg" style="background: #fff8e1; border: 1px solid #ffe082;">
                        <div class="flex items-center gap-2 text-sm mb-2">
                            <mat-icon style="font-size: 18px; width: 18px; height: 18px;"
                                      class="text-amber-600">security</mat-icon>
                            <span>
                                <strong>Storage Blob Data Contributor</strong> role is required to copy files.
                            </span>
                        </div>
                        <button mat-flat-button color="primary" (click)="grantAccess()"
                                [disabled]="grantingAccess" class="w-full">
                            <mat-spinner *ngIf="grantingAccess" diameter="18"
                                         class="mr-2 inline-block"></mat-spinner>
                            {{grantingAccess ? 'Granting access...' : 'Grant Contributor Access'}}
                        </button>
                        <div *ngIf="accessError" class="mt-2 text-xs"
                             style="color: #b91c1c;">{{accessError}}</div>
                    </div>

                    <!-- Propagating -->
                    <div *ngIf="selectedContainer && accessState === 'propagating'"
                         class="mt-4 p-3 rounded-lg flex items-center gap-3 text-sm"
                         style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534;">
                        <mat-spinner diameter="18"></mat-spinner>
                        Contributor access granted. Waiting for propagation...
                    </div>

                    <!-- Ready -->
                    <div *ngIf="selectedContainer && accessState === 'ready'"
                         class="mt-4 p-3 rounded-lg flex items-center gap-2 text-sm"
                         style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534;">
                        <mat-icon style="font-size: 18px; width: 18px; height: 18px;">check_circle</mat-icon>
                        Contributor access confirmed.
                    </div>

                    <!-- Destination folder -->
                    <mat-form-field *ngIf="selectedContainer && accessState === 'ready'"
                                    appearance="outline" class="w-full mt-3" subscriptSizing="dynamic">
                        <mat-label>Destination folder (optional)</mat-label>
                        <input matInput [(ngModel)]="destinationFolder"
                               (ngModelChange)="onDestinationFolderChange()" placeholder="drive-backup/2024">
                    </mat-form-field>
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
                <button mat-flat-button color="primary" (click)="startCopy()"
                        [disabled]="accessState !== 'ready' || submitting">
                    <mat-spinner *ngIf="submitting" diameter="18" class="mr-2 inline-block"></mat-spinner>
                    {{submitting ? 'Starting...' : 'Start Copy'}}
                </button>
            </ng-container>
        </mat-dialog-actions>
    `
})
export class CopyDriveToAzureDialogComponent implements OnInit, OnDestroy {
    subscriptions: AzureSubscription[] = [];
    resourceGroups: AzureResourceGroup[] = [];
    storageAccounts: AzureStorageAccount[] = [];
    containers: AzureContainer[] = [];

    selectedSubscriptionId = '';
    selectedResourceGroup = '';
    selectedAccountName = '';
    selectedContainer = '';
    destinationFolder = '';

    loadingStep: string | null = 'subscriptions';
    submitting = false;
    error: string | null = null;
    success = false;
    instanceId: string | null = null;

    accessState: string | null = null;
    grantingAccess = false;
    accessError: string | null = null;
    private probeTimer: ReturnType<typeof setInterval> | null = null;
    private static STORAGE_KEY = 'copyDriveToAzureState';

    constructor(
        private dialogRef: MatDialogRef<CopyDriveToAzureDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: CopyDriveToAzureDialogData,
        private azureBrowseService: AzureBrowseService,
        private processService: ProcessService,
        private oidcSecurityService: OidcSecurityService,
        private router: Router
    ) {}

    get totalSize(): number {
        return this.data.selectedFiles.reduce((sum, f) => sum + (f.size || 0), 0);
    }

    ngOnInit(): void {
        this.loadSubscriptions();
    }

    ngOnDestroy(): void {
        this.stopProbing();
    }

    loadSubscriptions(): void {
        this.loadingStep = 'subscriptions';
        this.azureBrowseService.listSubscriptions().subscribe({
            next: (subs) => {
                this.subscriptions = subs;
                this.loadingStep = null;
                this.restoreState();
            },
            error: () => {
                this.error = 'Failed to load Azure subscriptions. Make sure Azure is connected.';
                this.loadingStep = null;
            }
        });
    }

    onSubscriptionChange(): void {
        this.resourceGroups = [];
        this.storageAccounts = [];
        this.containers = [];
        this.selectedResourceGroup = '';
        this.selectedAccountName = '';
        this.selectedContainer = '';
        this.destinationFolder = '';
        this.resetAccessState();
        this.saveState();
        this.loadResourceGroups();
    }

    onResourceGroupChange(): void {
        this.storageAccounts = [];
        this.containers = [];
        this.selectedAccountName = '';
        this.selectedContainer = '';
        this.destinationFolder = '';
        this.resetAccessState();
        this.saveState();
        this.loadStorageAccounts();
    }

    onAccountChange(): void {
        this.containers = [];
        this.selectedContainer = '';
        this.destinationFolder = '';
        this.resetAccessState();
        this.saveState();
        this.loadContainers();
    }

    onContainerChange(): void {
        this.resetAccessState();
        this.saveState();
        if (this.selectedContainer) {
            this.checkAccess();
        }
    }

    onDestinationFolderChange(): void {
        this.saveState();
    }

    private loadResourceGroups(callback?: () => void): void {
        this.loadingStep = 'resourceGroups';
        this.azureBrowseService.listResourceGroups(this.selectedSubscriptionId).subscribe({
            next: (rgs) => { this.resourceGroups = rgs; this.loadingStep = null; callback?.(); },
            error: () => { this.error = 'Failed to load resource groups.'; this.loadingStep = null; }
        });
    }

    private loadStorageAccounts(callback?: () => void): void {
        this.loadingStep = 'accounts';
        this.azureBrowseService.listStorageAccounts(
            this.selectedSubscriptionId, this.selectedResourceGroup
        ).subscribe({
            next: (accs) => { this.storageAccounts = accs; this.loadingStep = null; callback?.(); },
            error: () => { this.error = 'Failed to load storage accounts.'; this.loadingStep = null; }
        });
    }

    private loadContainers(callback?: () => void): void {
        this.loadingStep = 'containers';
        this.azureBrowseService.listContainers(
            this.selectedSubscriptionId, this.selectedResourceGroup, this.selectedAccountName
        ).subscribe({
            next: (cs) => { this.containers = cs; this.loadingStep = null; callback?.(); },
            error: () => { this.error = 'Failed to load containers.'; this.loadingStep = null; }
        });
    }

    private checkAccess(): void {
        this.accessState = 'checking';
        this.azureBrowseService.checkStorageRole(
            this.selectedSubscriptionId, this.selectedResourceGroup, this.selectedAccountName
        ).subscribe({
            next: (res) => {
                if (res.hasRole) {
                    this.startProbing();
                } else {
                    this.accessState = 'no-role';
                }
            },
            error: () => {
                this.accessState = 'no-role';
            }
        });
    }

    grantAccess(): void {
        this.grantingAccess = true;
        this.accessError = null;
        this.azureBrowseService.assignStorageRole(
            this.selectedSubscriptionId, this.selectedResourceGroup, this.selectedAccountName
        ).subscribe({
            next: () => {
                this.grantingAccess = false;
                this.startProbing();
            },
            error: (err) => {
                const body = err?.error;
                if (err?.status === 400 && typeof body?.error === 'string'
                    && body.error.includes('AuthorizationFailed')) {
                    this.accessError =
                        'You don\'t have permission to assign roles on this storage account. '
                        + 'Ask an Owner to assign Storage Blob Data Contributor to you.';
                } else {
                    this.accessError =
                        'Failed to assign role. You may need to assign it manually in Azure Portal.';
                }
                this.grantingAccess = false;
            }
        });
    }

    private startProbing(): void {
        this.accessState = 'propagating';
        this.probeOnce();
        this.probeTimer = setInterval(() => this.probeOnce(), 10000);
    }

    private probeOnce(): void {
        this.azureBrowseService.probeContainerAccess(
            this.selectedAccountName, this.selectedContainer
        ).subscribe({
            next: (res) => {
                if (res.hasAccess) {
                    this.accessState = 'ready';
                    this.stopProbing();
                }
            }
        });
    }

    private stopProbing(): void {
        if (this.probeTimer) {
            clearInterval(this.probeTimer);
            this.probeTimer = null;
        }
    }

    private saveState(): void {
        sessionStorage.setItem(CopyDriveToAzureDialogComponent.STORAGE_KEY, JSON.stringify({
            selectedSubscriptionId: this.selectedSubscriptionId,
            selectedResourceGroup: this.selectedResourceGroup,
            selectedAccountName: this.selectedAccountName,
            selectedContainer: this.selectedContainer,
            destinationFolder: this.destinationFolder,
        }));
    }

    private restoreState(): void {
        const raw = sessionStorage.getItem(CopyDriveToAzureDialogComponent.STORAGE_KEY);
        if (!raw) return;

        let saved: Record<string, string>;
        try { saved = JSON.parse(raw); } catch { return; }

        if (!saved.selectedSubscriptionId
            || !this.subscriptions.some(s => s.subscriptionId === saved.selectedSubscriptionId)) return;

        this.selectedSubscriptionId = saved.selectedSubscriptionId;
        this.loadResourceGroups(() => {
            if (!saved.selectedResourceGroup
                || !this.resourceGroups.some(rg => rg.name === saved.selectedResourceGroup)) return;
            this.selectedResourceGroup = saved.selectedResourceGroup;

            this.loadStorageAccounts(() => {
                if (!saved.selectedAccountName
                    || !this.storageAccounts.some(a => a.name === saved.selectedAccountName)) return;
                this.selectedAccountName = saved.selectedAccountName;

                this.loadContainers(() => {
                    if (!saved.selectedContainer
                        || !this.containers.some(c => c.name === saved.selectedContainer)) return;
                    this.selectedContainer = saved.selectedContainer;
                    this.destinationFolder = saved.destinationFolder || '';
                    this.checkAccess();
                });
            });
        });
    }

    private resetAccessState(): void {
        this.stopProbing();
        this.accessState = null;
        this.accessError = null;
        this.grantingAccess = false;
    }

    startCopy(): void {
        this.submitting = true;
        this.error = null;

        const driveItems = this.data.selectedFiles.map(f => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            size: f.size
        }));

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

                return this.processService.startGoogleDriveToAzure({
                    driveItems,
                    accountName: this.selectedAccountName,
                    containerName: this.selectedContainer,
                    destinationFolder: this.destinationFolder.trim(),
                    azureAccessToken: azureToken,
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

    formatSize(size: number): string {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }

    goToProcesses(): void {
        this.dialogRef.close();
        this.router.navigate(['/processes']);
    }

    close(): void {
        this.dialogRef.close();
    }
}

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
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { forkJoin } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { PickedMediaItem } from 'app/core/services/google-photos.service';
import { ProcessService } from 'app/core/services/process.service';
import {
    AzureBrowseService,
    AzureSubscription,
    AzureResourceGroup,
    AzureStorageAccount,
    AzureContainer
} from 'app/core/services/azure-browse.service';

export interface CopyToAzureDialogData {
    pickedItems: PickedMediaItem[];
}

@Component({
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatDialogModule, MatIconModule, MatButtonModule,
        MatSelectModule, MatFormFieldModule, MatInputModule,
        MatProgressSpinnerModule, MatMenuModule, MatTooltipModule
    ],
    selector: 'app-copy-to-azure-dialog',
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
                <mat-icon class="text-green-500" style="font-size: 48px; width: 48px; height: 48px;">check_circle</mat-icon>
                <div class="mt-3 text-lg font-semibold">Copy started!</div>
                <div class="mt-1 text-sm text-secondary">Instance: {{instanceId}}</div>
            </div>

            <!-- Form state -->
            <ng-container *ngIf="!success">
                <!-- Summary -->
                <div class="mb-5 p-3 rounded-lg text-sm" style="background: #e3f2fd;">
                    <div class="flex items-center gap-2">
                        <mat-icon style="font-size: 18px; width: 18px; height: 18px; color: #1976d2;">photo_library</mat-icon>
                        <span>
                            <strong>{{data.pickedItems.length}}</strong> photo{{data.pickedItems.length !== 1 ? 's' : ''}}
                            selected for copy
                        </span>
                    </div>
                </div>

                <!-- Azure Destination -->
                <div class="text-sm font-semibold mb-2" style="color: #424242;">Azure Destination</div>
                <div class="mb-3 flex items-center gap-1 text-xs text-secondary">
                    <mat-icon style="font-size: 15px; width: 15px; height: 15px;">info</mat-icon>
                    <span>Requires <strong>Storage Blob Data Contributor</strong> role on the target storage account.</span>
                    <span [matMenuTriggerFor]="roleHelpMenu"
                          matTooltip="How to assign this role"
                          class="cursor-pointer inline-flex items-center text-secondary hover:text-fg-base transition-colors duration-150">
                        <mat-icon style="font-size: 16px; width: 16px; height: 16px;">help_outline</mat-icon>
                    </span>
                </div>

                <mat-menu #roleHelpMenu xPosition="after">
                    <div class="p-4" style="max-width: 320px;" (click)="$event.stopPropagation()">
                        <p class="text-sm font-semibold mb-2">How to assign the role</p>
                        <ol class="list-decimal list-inside space-y-1 text-secondary text-xs leading-relaxed">
                            <li>Go to the <strong>Azure Portal</strong> &rarr; your Storage Account</li>
                            <li>Click <strong>Access Control (IAM)</strong> in the left menu</li>
                            <li>Click <strong>+ Add</strong> &rarr; <strong>Add role assignment</strong></li>
                            <li>Search for <strong>Storage Blob Data Contributor</strong> and select it</li>
                            <li>Click <strong>Members</strong>, then <strong>+ Select members</strong></li>
                            <li>Search for your user account and select it</li>
                            <li>Click <strong>Review + assign</strong></li>
                        </ol>
                        <p class="text-xs text-secondary mt-3 flex items-center gap-1">
                            <mat-icon style="font-size: 14px; width: 14px; height: 14px;" class="text-amber-500">schedule</mat-icon>
                            Role assignments can take up to 5 minutes to take effect.
                        </p>
                    </div>
                </mat-menu>

                <!-- Loading subscriptions -->
                <div *ngIf="loadingStep === 'subscriptions'" class="flex items-center justify-center gap-3 py-8 text-sm text-secondary">
                    <mat-spinner diameter="24"></mat-spinner>
                    Loading subscriptions...
                </div>

                <ng-container *ngIf="loadingStep !== 'subscriptions'">
                    <!-- Subscription -->
                    <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                        <mat-label>Subscription</mat-label>
                        <mat-select [(ngModel)]="selectedSubscriptionId" (selectionChange)="onSubscriptionChange()">
                            <mat-option *ngFor="let sub of subscriptions" [value]="sub.subscriptionId">
                                {{sub.displayName}}
                            </mat-option>
                        </mat-select>
                    </mat-form-field>

                    <!-- Resource Group -->
                    <mat-form-field *ngIf="selectedSubscriptionId" appearance="outline" class="w-full mt-3" subscriptSizing="dynamic">
                        <mat-label>Resource Group</mat-label>
                        <mat-select [(ngModel)]="selectedResourceGroup" (selectionChange)="onResourceGroupChange()"
                                    [disabled]="loadingStep === 'resourceGroups'">
                            <mat-option *ngFor="let rg of resourceGroups" [value]="rg.name">
                                {{rg.name}}
                            </mat-option>
                        </mat-select>
                        <mat-hint *ngIf="loadingStep === 'resourceGroups'">Loading...</mat-hint>
                    </mat-form-field>

                    <!-- Storage Account -->
                    <mat-form-field *ngIf="selectedResourceGroup" appearance="outline" class="w-full mt-3" subscriptSizing="dynamic">
                        <mat-label>Storage Account</mat-label>
                        <mat-select [(ngModel)]="selectedAccountName" (selectionChange)="onAccountChange()"
                                    [disabled]="loadingStep === 'accounts'">
                            <mat-option *ngFor="let acc of storageAccounts" [value]="acc.name">
                                {{acc.name}}
                            </mat-option>
                        </mat-select>
                        <mat-hint *ngIf="loadingStep === 'accounts'">Loading...</mat-hint>
                    </mat-form-field>

                    <!-- Container -->
                    <mat-form-field *ngIf="selectedAccountName" appearance="outline" class="w-full mt-3" subscriptSizing="dynamic">
                        <mat-label>Container</mat-label>
                        <mat-select [(ngModel)]="selectedContainer"
                                    [disabled]="loadingStep === 'containers'">
                            <mat-option *ngFor="let c of containers" [value]="c.name">
                                {{c.name}}
                            </mat-option>
                        </mat-select>
                        <mat-hint *ngIf="loadingStep === 'containers'">Loading...</mat-hint>
                    </mat-form-field>

                    <!-- Destination folder (optional) -->
                    <mat-form-field *ngIf="selectedContainer" appearance="outline" class="w-full mt-3" subscriptSizing="dynamic">
                        <mat-label>Destination folder (optional)</mat-label>
                        <input matInput [(ngModel)]="destinationFolder" placeholder="photos/2024">
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
                        [disabled]="!selectedContainer || submitting">
                    <mat-spinner *ngIf="submitting" diameter="18" class="mr-2 inline-block"></mat-spinner>
                    {{submitting ? 'Starting...' : 'Start Copy'}}
                </button>
            </ng-container>
        </mat-dialog-actions>
    `
})
export class CopyToAzureDialogComponent implements OnInit {
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

    constructor(
        private dialogRef: MatDialogRef<CopyToAzureDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: CopyToAzureDialogData,
        private azureBrowseService: AzureBrowseService,
        private processService: ProcessService,
        private oidcSecurityService: OidcSecurityService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.loadSubscriptions();
    }

    loadSubscriptions(): void {
        this.loadingStep = 'subscriptions';
        this.azureBrowseService.listSubscriptions().subscribe({
            next: (subs) => {
                this.subscriptions = subs;
                this.loadingStep = null;
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
        this.loadingStep = 'resourceGroups';
        this.azureBrowseService.listResourceGroups(this.selectedSubscriptionId).subscribe({
            next: (rgs) => { this.resourceGroups = rgs; this.loadingStep = null; },
            error: () => { this.error = 'Failed to load resource groups.'; this.loadingStep = null; }
        });
    }

    onResourceGroupChange(): void {
        this.storageAccounts = [];
        this.containers = [];
        this.selectedAccountName = '';
        this.selectedContainer = '';
        this.loadingStep = 'accounts';
        this.azureBrowseService.listStorageAccounts(this.selectedSubscriptionId, this.selectedResourceGroup).subscribe({
            next: (accs) => { this.storageAccounts = accs; this.loadingStep = null; },
            error: () => { this.error = 'Failed to load storage accounts.'; this.loadingStep = null; }
        });
    }

    onAccountChange(): void {
        this.containers = [];
        this.selectedContainer = '';
        this.loadingStep = 'containers';
        this.azureBrowseService.listContainers(this.selectedSubscriptionId, this.selectedResourceGroup, this.selectedAccountName).subscribe({
            next: (cs) => { this.containers = cs; this.loadingStep = null; },
            error: () => { this.error = 'Failed to load containers.'; this.loadingStep = null; }
        });
    }

    startCopy(): void {
        this.submitting = true;
        this.error = null;

        const photoItems = this.data.pickedItems.map(p => ({
            id: p.id,
            baseUrl: p.mediaFile.baseUrl,
            mimeType: p.mediaFile.mimeType,
            filename: p.mediaFile.filename
        }));

        forkJoin({
            azureToken: this.oidcSecurityService.getAccessToken('azure-storage').pipe(take(1)),
            googleUser: this.oidcSecurityService.getUserData('google').pipe(take(1)),
            azureUser: this.oidcSecurityService.getUserData('azure').pipe(take(1))
        }).pipe(
            switchMap(({ azureToken, googleUser, azureUser }) => {
                const emails: { provider: string; email: string }[] = [];
                if (googleUser?.email) emails.push({ provider: 'google', email: googleUser.email });
                if (azureUser?.preferred_username) emails.push({ provider: 'azure', email: azureUser.preferred_username });
                else if (azureUser?.email) emails.push({ provider: 'azure', email: azureUser.email });

                return this.processService.startGooglePhotosToAzure({
                    photoItems,
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

    goToProcesses(): void {
        this.dialogRef.close();
        this.router.navigate(['/processes']);
    }

    close(): void {
        this.dialogRef.close();
    }
}

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { first } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import {
    AzureBrowseService,
    AzureSubscription,
    AzureResourceGroup,
    AzureStorageAccount,
    AzureContainer
} from 'app/core/services/azure-browse.service';
import { MultiAuthService } from 'app/core/auth/multi-auth.service';
import { StorageHelpDialogComponent } from './storage-help-dialog.component';

interface BreadcrumbItem {
    label: string;
    level: 'subscriptions' | 'resourceGroups' | 'storageAccounts' | 'containers';
}

@Component({
    standalone: false,
    selector: 'app-storage-browser',
    templateUrl: './storage-browser.component.html',
    styleUrls: ['./storage-browser.component.scss']
})
export class StorageBrowserComponent implements OnInit {
    isAzureConnected = false;
    isAzureStorageConnected = false;
    loading = false;
    error: string | null = null;

    currentLevel: 'subscriptions' | 'resourceGroups' | 'storageAccounts' | 'containers' = 'subscriptions';
    breadcrumbs: BreadcrumbItem[] = [];

    subscriptions: AzureSubscription[] = [];
    resourceGroups: AzureResourceGroup[] = [];
    storageAccounts: AzureStorageAccount[] = [];
    containers: AzureContainer[] = [];

    selectedSubscription: AzureSubscription | null = null;
    selectedResourceGroup: AzureResourceGroup | null = null;
    selectedStorageAccount: AzureStorageAccount | null = null;

    constructor(
        private azureBrowseService: AzureBrowseService,
        private multiAuthService: MultiAuthService,
        private router: Router,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.multiAuthService.watchAuthStatus().pipe(first()).subscribe((providers) => {
            const azure = providers.find(p => p.configId === 'azure');
            this.isAzureConnected = azure?.authenticated ?? false;
            const azureStorage = providers.find(p => p.configId === 'azure-storage');
            this.isAzureStorageConnected = azureStorage?.authenticated ?? false;
            if (this.isAzureConnected) {
                this.loadSubscriptions();
            }
        });
    }

    loadSubscriptions(): void {
        this.loading = true;
        this.error = null;
        this.currentLevel = 'subscriptions';
        this.breadcrumbs = [];
        this.selectedSubscription = null;
        this.selectedResourceGroup = null;
        this.selectedStorageAccount = null;

        this.azureBrowseService.listSubscriptions().subscribe({
            next: (data) => {
                this.subscriptions = data;
                this.loading = false;
            },
            error: (err) => {
                this.error = this.extractError(err, 'Failed to load subscriptions');
                this.loading = false;
            }
        });
    }

    selectSubscription(sub: AzureSubscription): void {
        this.selectedSubscription = sub;
        this.currentLevel = 'resourceGroups';
        this.breadcrumbs = [{ label: sub.displayName, level: 'subscriptions' }];
        this.loading = true;
        this.error = null;

        this.azureBrowseService.listResourceGroups(sub.subscriptionId).subscribe({
            next: (data) => {
                this.resourceGroups = data;
                this.loading = false;
            },
            error: (err) => {
                this.error = this.extractError(err, 'Failed to load resource groups');
                this.loading = false;
            }
        });
    }

    selectResourceGroup(rg: AzureResourceGroup): void {
        this.selectedResourceGroup = rg;
        this.currentLevel = 'storageAccounts';
        this.breadcrumbs = [
            { label: this.selectedSubscription!.displayName, level: 'subscriptions' },
            { label: rg.name, level: 'resourceGroups' }
        ];
        this.loading = true;
        this.error = null;

        this.azureBrowseService.listStorageAccounts(
            this.selectedSubscription!.subscriptionId, rg.name
        ).subscribe({
            next: (data) => {
                this.storageAccounts = data;
                this.loading = false;
            },
            error: (err) => {
                this.error = this.extractError(err, 'Failed to load storage accounts');
                this.loading = false;
            }
        });
    }

    selectStorageAccount(account: AzureStorageAccount): void {
        this.selectedStorageAccount = account;
        this.currentLevel = 'containers';
        this.breadcrumbs = [
            { label: this.selectedSubscription!.displayName, level: 'subscriptions' },
            { label: this.selectedResourceGroup!.name, level: 'resourceGroups' },
            { label: account.name, level: 'storageAccounts' }
        ];
        this.loading = true;
        this.error = null;

        this.azureBrowseService.listContainers(
            this.selectedSubscription!.subscriptionId,
            this.selectedResourceGroup!.name,
            account.name
        ).subscribe({
            next: (data) => {
                this.containers = data;
                this.loading = false;
            },
            error: (err) => {
                this.error = this.extractError(err, 'Failed to load containers');
                this.loading = false;
            }
        });
    }

    selectContainer(container: AzureContainer): void {
        const queryParams = {
            provider: 'azure',
            account: this.selectedStorageAccount!.name,
            container: container.name
        };

        if (!this.isAzureStorageConnected) {
            const target = `/file-manager?provider=azure&account=${encodeURIComponent(queryParams.account)}&container=${encodeURIComponent(queryParams.container)}`;
            localStorage.setItem('redirect', JSON.stringify(target));
            this.multiAuthService.login('azure-storage');
            return;
        }

        this.router.navigate(['/file-manager'], { queryParams });
    }

    navigateToBreadcrumb(crumb: BreadcrumbItem): void {
        switch (crumb.level) {
            case 'subscriptions':
                this.loadSubscriptions();
                break;
            case 'resourceGroups':
                if (this.selectedSubscription) {
                    this.selectSubscription(this.selectedSubscription);
                }
                break;
            case 'storageAccounts':
                if (this.selectedResourceGroup) {
                    this.selectResourceGroup(this.selectedResourceGroup);
                }
                break;
        }
    }

    connectAzure(): void {
        this.multiAuthService.login('azure');
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

    openHelp(): void {
        this.dialog.open(StorageHelpDialogComponent, { width: '560px' });
    }

    get levelTitle(): string {
        switch (this.currentLevel) {
            case 'subscriptions': return 'Subscriptions';
            case 'resourceGroups': return 'Resource Groups';
            case 'storageAccounts': return 'Storage Accounts';
            case 'containers': return 'Containers';
        }
    }
}

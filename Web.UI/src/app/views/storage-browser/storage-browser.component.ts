import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class StorageBrowserComponent implements OnInit, OnDestroy {
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

    // Access check state for container read access
    selectedContainer: AzureContainer | null = null;
    accessState: 'checking' | 'no-role' | 'propagating' | 'ready' | null = null;
    grantingAccess = false;
    accessError: string | null = null;
    private probeTimer: ReturnType<typeof setInterval> | null = null;

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
                if (!this.restoreState()) {
                    this.loadSubscriptions();
                }
            }
        });
    }

    ngOnDestroy(): void {
        this.stopProbing();
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
                this.saveState();
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
                this.saveState();
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
                this.saveState();
            },
            error: (err) => {
                this.error = this.extractError(err, 'Failed to load storage accounts');
                this.loading = false;
            }
        });
    }

    selectStorageAccount(account: AzureStorageAccount): void {
        this.selectedStorageAccount = account;
        this.selectedContainer = null;
        this.resetAccessState();
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
                this.saveState();
            },
            error: (err) => {
                this.error = this.extractError(err, 'Failed to load containers');
                this.loading = false;
            }
        });
    }

    selectContainer(container: AzureContainer): void {
        if (!this.isAzureStorageConnected) {
            const queryParams = {
                provider: 'azure',
                account: this.selectedStorageAccount!.name,
                container: container.name
            };
            this.saveState(container);
            const target = `/file-manager?provider=azure&account=${encodeURIComponent(queryParams.account)}&container=${encodeURIComponent(queryParams.container)}`;
            localStorage.setItem('redirect', JSON.stringify(target));
            this.multiAuthService.login('azure-storage');
            return;
        }

        this.selectedContainer = container;
        this.resetAccessState();
        this.checkReadAccess();
    }

    private checkReadAccess(): void {
        this.accessState = 'checking';
        this.azureBrowseService.checkStorageRole(
            this.selectedSubscription!.subscriptionId,
            this.selectedResourceGroup!.name,
            this.selectedStorageAccount!.name,
            'reader'
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

    grantReadAccess(): void {
        this.grantingAccess = true;
        this.accessError = null;
        this.azureBrowseService.assignStorageRole(
            this.selectedSubscription!.subscriptionId,
            this.selectedResourceGroup!.name,
            this.selectedStorageAccount!.name,
            'reader'
        ).subscribe({
            next: () => {
                this.grantingAccess = false;
                this.startProbing();
            },
            error: (err) => {
                const body = err?.error;
                if (err?.status === 400 && typeof body?.error === 'string' && body.error.includes('AuthorizationFailed')) {
                    this.accessError = 'You don\'t have permission to assign roles on this storage account. Ask an Owner to assign Storage Blob Data Reader to you.';
                } else {
                    this.accessError = 'Failed to assign role. You may need to assign it manually in Azure Portal.';
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
            this.selectedStorageAccount!.name,
            this.selectedContainer!.name
        ).subscribe({
            next: (res) => {
                if (res.hasAccess) {
                    this.accessState = 'ready';
                    this.stopProbing();
                    this.navigateToFileManager();
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

    private resetAccessState(): void {
        this.stopProbing();
        this.accessState = null;
        this.accessError = null;
        this.grantingAccess = false;
    }

    private navigateToFileManager(): void {
        this.saveState(this.selectedContainer!);
        this.router.navigate(['/file-manager'], {
            queryParams: {
                provider: 'azure',
                account: this.selectedStorageAccount!.name,
                container: this.selectedContainer!.name
            }
        });
    }

    dismissAccessPanel(): void {
        this.selectedContainer = null;
        this.resetAccessState();
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

    private saveState(selectedContainer?: AzureContainer): void {
        const state: Record<string, unknown> = {
            currentLevel: this.currentLevel,
            selectedSubscription: this.selectedSubscription,
            selectedResourceGroup: this.selectedResourceGroup,
            selectedStorageAccount: this.selectedStorageAccount,
        };
        if (selectedContainer) {
            state['selectedContainer'] = selectedContainer;
        }
        sessionStorage.setItem('storageBrowserState', JSON.stringify(state));
    }

    private restoreState(): boolean {
        const raw = sessionStorage.getItem('storageBrowserState');
        if (!raw) return false;
        try {
            const state = JSON.parse(raw);
            if (state.currentLevel === 'subscriptions' || !state.currentLevel) return false;

            // If a container was selected, navigate directly to file-manager
            if (state.selectedContainer && state.selectedStorageAccount) {
                this.selectedSubscription = state.selectedSubscription;
                this.selectedResourceGroup = state.selectedResourceGroup;
                this.selectedStorageAccount = state.selectedStorageAccount;
                this.router.navigate(['/file-manager'], {
                    queryParams: {
                        provider: 'azure',
                        account: state.selectedStorageAccount.name,
                        container: state.selectedContainer.name
                    }
                });
                return true;
            }

            if (state.currentLevel === 'resourceGroups' && state.selectedSubscription) {
                this.selectSubscription(state.selectedSubscription);
                return true;
            }
            if (state.currentLevel === 'storageAccounts' && state.selectedSubscription && state.selectedResourceGroup) {
                this.selectedSubscription = state.selectedSubscription;
                this.selectResourceGroup(state.selectedResourceGroup);
                return true;
            }
            if (state.currentLevel === 'containers' && state.selectedSubscription && state.selectedResourceGroup && state.selectedStorageAccount) {
                this.selectedSubscription = state.selectedSubscription;
                this.selectedResourceGroup = state.selectedResourceGroup;
                this.selectStorageAccount(state.selectedStorageAccount);
                return true;
            }
        } catch {
            sessionStorage.removeItem('storageBrowserState');
        }
        return false;
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

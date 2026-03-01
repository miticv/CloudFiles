import { Component, OnInit, OnDestroy } from '@angular/core';
import { forkJoin } from 'rxjs';
import { first, switchMap } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import {
    ProcessService,
    OrchestrationInstance,
    OrchestrationRuntimeStatus,
    ProcessListParams,
    StartMigrationRequest,
    StartGoogleStorageRequest
} from 'app/core/services/process.service';
import { ConfirmDialogComponent } from 'app/shared/components/confirm-dialog/confirm-dialog.component';
import { environment } from 'environments/environment';

export interface ProcessGroup {
    parent: OrchestrationInstance;
    children: OrchestrationInstance[];
}

const PARENT_NAMES = new Set([
    'azureStorageToGooglePhotosOrchestrator',
    'googleStorageToGooglePhotosOrchestrator',
    'googlePhotosToAzureOrchestrator'
]);

const CHILD_NAMES = new Set([
    'copyAzureBlobsToGooglePhotosOrchestrator',
    'copyGoogleStorageToGooglePhotosOrchestrator',
    'copyGooglePhotosToAzureOrchestrator'
]);

@Component({
    standalone: false,
    selector: 'app-processes',
    templateUrl: './processes.component.html',
    styleUrls: ['./processes.component.scss']
})
export class ProcessesComponent implements OnInit, OnDestroy {
    instances: OrchestrationInstance[] = [];
    groups: ProcessGroup[] = [];
    loading = false;
    error: string | null = null;
    statusFilter: number[] = [];
    expandedInstanceId: string | null = null;
    deletingInstanceIds = new Set<string>();
    retryingGroupIds = new Set<string>();
    isAdmin = false;
    showAll = false;
    fromDate: Date | null = (() => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d; })();
    toDate: Date | null = new Date();
    private refreshTimer: ReturnType<typeof setInterval> | null = null;

    readonly statusLabels: Record<number, string> = {
        [OrchestrationRuntimeStatus.Running]: 'Running',
        [OrchestrationRuntimeStatus.Completed]: 'Completed',
        [OrchestrationRuntimeStatus.ContinuedAsNew]: 'Continued',
        [OrchestrationRuntimeStatus.Failed]: 'Failed',
        [OrchestrationRuntimeStatus.Canceled]: 'Canceled',
        [OrchestrationRuntimeStatus.Terminated]: 'Terminated',
        [OrchestrationRuntimeStatus.Pending]: 'Pending'
    };

    readonly statusColors: Record<number, string> = {
        [OrchestrationRuntimeStatus.Running]: 'bg-blue-100 text-blue-800',
        [OrchestrationRuntimeStatus.Completed]: 'bg-green-100 text-green-800',
        [OrchestrationRuntimeStatus.ContinuedAsNew]: 'bg-purple-100 text-purple-800',
        [OrchestrationRuntimeStatus.Failed]: 'bg-red-100 text-red-800',
        [OrchestrationRuntimeStatus.Canceled]: 'bg-gray-100 text-gray-800',
        [OrchestrationRuntimeStatus.Terminated]: 'bg-orange-100 text-orange-800',
        [OrchestrationRuntimeStatus.Pending]: 'bg-yellow-100 text-yellow-800'
    };

    readonly statusIcons: Record<number, string> = {
        [OrchestrationRuntimeStatus.Running]: 'sync',
        [OrchestrationRuntimeStatus.Completed]: 'check_circle',
        [OrchestrationRuntimeStatus.ContinuedAsNew]: 'replay',
        [OrchestrationRuntimeStatus.Failed]: 'error',
        [OrchestrationRuntimeStatus.Canceled]: 'cancel',
        [OrchestrationRuntimeStatus.Terminated]: 'stop_circle',
        [OrchestrationRuntimeStatus.Pending]: 'schedule'
    };

    constructor(
        private processService: ProcessService,
        private dialog: MatDialog,
        private oidcService: OidcSecurityService
    ) {}

    ngOnInit(): void {
        this.oidcService.getUserData('google').pipe(first()).subscribe((userData: Record<string, unknown>) => {
            this.isAdmin = (userData?.['email'] as string) === environment.adminEmail;
        });
        this.loadInstances();
        this.startAutoRefresh();
    }

    ngOnDestroy(): void {
        this.stopAutoRefresh();
    }

    loadInstances(): void {
        this.loading = true;
        this.error = null;
        const params: ProcessListParams = {};
        if (this.statusFilter.length > 0) {
            params.statusList = this.statusFilter;
        }
        if (this.showAll && this.isAdmin) {
            params.all = true;
        }
        if (this.fromDate) params.from = this.formatDate(this.fromDate);
        if (this.toDate) params.to = this.formatDate(this.toDate);
        this.processService.listInstances(params).subscribe({
            next: (data) => {
                this.instances = data;
                this.groups = this.buildGroups(data);
                this.startedByCache.clear();
                this.loading = false;
            },
            error: (err) => {
                this.error = this.extractError(err);
                this.loading = false;
            }
        });
    }

    onFilterChange(): void {
        this.loadInstances();
    }

    onDateChange(): void {
        this.loadInstances();
    }

    toggleShowAll(): void {
        this.showAll = !this.showAll;
        this.loadInstances();
    }

    toggleExpand(instanceId: string): void {
        this.expandedInstanceId =
            this.expandedInstanceId === instanceId ? null : instanceId;
    }

    parseJson(serialized: string): Record<string, unknown> | null {
        if (!serialized) return null;
        try { return JSON.parse(serialized); } catch { return null; }
    }

    redactOutput(serialized: string): string {
        if (!serialized) return '';
        return serialized.replace(/"(accessToken|azureAccessToken|AccessToken|AzureAccessToken)"\s*:\s*"[^"]*"/gi,
            '"$1":"[REDACTED]"');
    }

    getInputSummary(instance: OrchestrationInstance): string {
        // Google Photos → Azure: show photo count
        const input = this.parseJson(instance.serializedInput);
        if (input) {
            const photoItems = (input['photoItems'] || input['PhotoItems']) as unknown[];
            if (photoItems) {
                return `${photoItems.length} photo${photoItems.length !== 1 ? 's' : ''}`;
            }
        }

        const selected = this.getSelectedItems(instance);
        if (!selected.length) return '';
        if (selected.length === 1) return selected[0].isFolder ? selected[0].name : selected[0].name;
        const folders = selected.filter(i => i.isFolder).length;
        const files = selected.length - folders;
        const parts: string[] = [];
        if (folders) parts.push(`${folders} folder${folders > 1 ? 's' : ''}`);
        if (files) parts.push(`${files} file${files > 1 ? 's' : ''}`);
        return parts.join(', ');
    }

    getStartedBy(instance: OrchestrationInstance): string {
        const input = this.parseJson(instance.serializedInput);
        if (!input) return '';
        return (input['startedBy'] as string) || (input['StartedBy'] as string) || '';
    }

    private startedByCache = new Map<string, { provider: 'google' | 'azure' | null; email: string }[]>();

    getStartedByEntries(instance: OrchestrationInstance): { provider: 'google' | 'azure' | null; email: string }[] {
        const cached = this.startedByCache.get(instance.instanceId);
        if (cached) return cached;

        const raw = this.getStartedBy(instance);
        if (!raw) return [];

        // Split by | (new format) or , (legacy format)
        const parts = raw.includes('|') ? raw.split('|') : raw.split(',');
        const defaultProvider = this.getProvider(instance);

        const entries = parts.map((part) => {
            const trimmed = part.trim();
            // Check for provider prefix: "google:email" or "azure:email"
            const colonIdx = trimmed.indexOf(':');
            if (colonIdx > 0) {
                const prefix = trimmed.substring(0, colonIdx);
                if (prefix === 'google' || prefix === 'azure') {
                    return { provider: prefix as 'google' | 'azure', email: trimmed.substring(colonIdx + 1) };
                }
            }
            return { provider: defaultProvider, email: trimmed };
        }).filter(e => e.email);

        this.startedByCache.set(instance.instanceId, entries);
        return entries;
    }

    getAlbumTitle(instance: OrchestrationInstance): string {
        const input = this.parseJson(instance.serializedInput);
        if (!input) return '';
        return (input['albumTitle'] as string) || (input['AlbumTitle'] as string) || '';
    }

    getMigrationSummary(instance: OrchestrationInstance): { from: string; to: string } | null {
        const input = this.parseJson(instance.serializedInput);
        if (!input) return null;
        const account = (input['accountName'] || input['AccountName']) as string;
        const container = (input['containerName'] || input['ContainerName']) as string;
        const bucket = (input['bucketName'] || input['BucketName']) as string;
        const album = this.getAlbumTitle(instance)
            || (input['albumId'] as string) || (input['AlbumId'] as string);

        // Google Photos → Azure direction
        const photoItems = (input['photoItems'] || input['PhotoItems']) as unknown[];
        if (photoItems && account && container) {
            const folder = (input['destinationFolder'] || input['DestinationFolder']) as string;
            const dest = folder
                ? `Azure (${account}/${container}/${folder})`
                : `Azure (${account}/${container})`;
            return { from: `Google Photos (${photoItems.length} photos)`, to: dest };
        }

        // Azure/Google Storage → Google Photos direction
        if (!album) return null;

        let from = '';
        if (account && container) from = `Azure (Account: ${account}, Container: ${container})`;
        else if (bucket) from = `Google Storage (Bucket: ${bucket})`;
        if (!from) return null;

        return { from, to: `Google Photos (Album: ${album})` };
    }

    getSucceededFiles(instance: OrchestrationInstance): { name: string; path: string; isImage: boolean }[] {
        const output = this.parseJson(instance.serializedOutput);
        if (!output) return [];
        const imageExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif', 'tiff', 'tif', 'svg']);

        // GooglePhotosToAzure: results[] with success flag
        const results = (output['results'] ?? output['Results']) as
            { filename?: string; Filename?: string; blobPath?: string; BlobPath?: string; success?: boolean; Success?: boolean }[] | undefined;
        if (results) {
            return results
                .filter(r => r.success ?? r.Success)
                .map(r => {
                    const name = r.filename || r.Filename || 'unknown';
                    const path = r.blobPath || r.BlobPath || '';
                    const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
                    return { name, path, isImage: imageExts.has(ext) };
                });
        }

        // AzureToGoogle / GCSToGoogle: newMediaItemResults[] — success = mediaItem.id non-empty
        const mediaResults = (output['newMediaItemResults'] ?? output['NewMediaItemResults']) as
            { mediaItem?: { id?: string; filename?: string } }[] | undefined;
        if (mediaResults) {
            return mediaResults
                .filter(r => r.mediaItem?.id)
                .map(r => {
                    const name = r.mediaItem!.filename || 'unknown';
                    const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
                    return { name, path: '', isImage: imageExts.has(ext) };
                });
        }

        return [];
    }

    getFailedFiles(instance: OrchestrationInstance): { name: string; error: string }[] {
        const output = this.parseJson(instance.serializedOutput);
        if (!output) return [];

        // GooglePhotosToAzure: results[] with success === false
        const results = (output['results'] ?? output['Results']) as
            { filename?: string; Filename?: string; success?: boolean; Success?: boolean; errorMessage?: string; ErrorMessage?: string }[] | undefined;
        if (results) {
            return results
                .filter(r => !(r.success ?? r.Success))
                .map(r => ({
                    name: r.filename || r.Filename || 'unknown',
                    error: r.errorMessage || r.ErrorMessage || 'Unknown error'
                }));
        }

        // AzureToGoogle / GCSToGoogle: newMediaItemResults[] — failure = mediaItem.id empty
        const mediaResults = (output['newMediaItemResults'] ?? output['NewMediaItemResults']) as
            { mediaItem?: { id?: string; filename?: string }; status?: { message?: string } }[] | undefined;
        if (mediaResults) {
            return mediaResults
                .filter(r => !r.mediaItem?.id)
                .map(r => ({
                    name: r.mediaItem?.filename || 'unknown',
                    error: r.status?.message || 'Unknown error'
                }));
        }

        return [];
    }

    getSelectedItems(instance: OrchestrationInstance): { name: string; path: string; isFolder: boolean; isImage: boolean }[] {
        const input = this.parseJson(instance.serializedInput);
        if (!input) return [];
        const imageExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif', 'tiff', 'tif', 'svg']);

        // AzureToGoogle / GCSToGoogle: selectedItemsList
        const items = (input['selectedItemsList'] ?? input['SelectedItemsList']) as
            { itemPath?: string; ItemPath?: string; isFolder?: boolean; IsFolder?: boolean }[] | undefined;
        if (items) {
            return items.map((i) => {
                const path = i.itemPath || i.ItemPath || '';
                const name = path.includes('/') ? path.substring(path.lastIndexOf('/') + 1) : path;
                const isFolder = i.isFolder ?? i.IsFolder ?? false;
                const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
                return { name: name || path, path, isFolder, isImage: !isFolder && imageExts.has(ext) };
            });
        }

        // GooglePhotosToAzure: input uses photoItems
        const photoItems = (input['photoItems'] ?? input['PhotoItems']) as
            { filename?: string; Filename?: string }[] | undefined;
        if (photoItems) {
            return photoItems.map((i) => {
                const name = i.filename || i.Filename || 'unknown';
                const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
                return { name, path: '', isFolder: false, isImage: imageExts.has(ext) };
            });
        }

        return [];
    }

    getChildFiles(child: OrchestrationInstance): { name: string; path: string; isImage: boolean }[] {
        const input = this.parseJson(child.serializedInput);
        if (!input) return [];

        // Google Photos → Azure child: listItemsPrepared uses filename/destinationPath
        const prepared = (input['listItemsPrepared'] ?? input['ListItemsPrepared']) as
            { filename?: string; Filename?: string; destinationPath?: string; DestinationPath?: string;
              itemFilename?: string; itemPath?: string; ItemFilename?: string; ItemPath?: string }[] | undefined;
        if (!prepared) return [];
        const imageExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif', 'tiff', 'tif', 'svg']);
        return prepared.map((i) => {
            const name = i.filename || i.Filename || i.itemFilename || i.ItemFilename || i.itemPath || i.ItemPath || 'unknown';
            const path = i.destinationPath || i.DestinationPath || i.itemPath || i.ItemPath || '';
            const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
            return { name, path, isImage: imageExts.has(ext) };
        });
    }

    getSubProgress(child: OrchestrationInstance): { completed: number; total: number; lastFile: string } | null {
        const status = this.parseJson(child.serializedCustomStatus);
        if (!status || !status['total']) return null;
        return {
            completed: (status['completed'] as number) || 0,
            total: (status['total'] as number) || 0,
            lastFile: (status['lastFile'] as string) || ''
        };
    }

    getFileIcon(fileName: string): string {
        const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';
        const imageExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif', 'tiff', 'tif', 'svg']);
        const videoExts = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm']);
        if (imageExts.has(ext)) return 'image';
        if (videoExts.has(ext)) return 'videocam';
        return 'insert_drive_file';
    }

    trackByEmail(_index: number, entry: { provider: string | null; email: string }): string {
        return `${entry.provider}:${entry.email}`;
    }

    getProvider(instance: OrchestrationInstance): 'google' | 'azure' | null {
        const name = instance.name;
        if (name === 'azureStorageToGooglePhotosOrchestrator') return 'azure';
        if (name === 'googleStorageToGooglePhotosOrchestrator') return 'google';
        if (name === 'googlePhotosToAzureOrchestrator') return 'google';
        return null;
    }

    getProviderLabel(instance: OrchestrationInstance): string {
        const p = this.getProvider(instance);
        return p === 'google' ? 'Google' : p === 'azure' ? 'Microsoft Azure' : '';
    }

    getDisplayName(name: string): string {
        if (name === 'azureStorageToGooglePhotosOrchestrator') return 'Azure to Google Photos';
        if (name === 'googleStorageToGooglePhotosOrchestrator') return 'Google Storage to Photos';
        if (name === 'googlePhotosToAzureOrchestrator') return 'Google Photos to Azure';
        if (name === 'copyAzureBlobsToGooglePhotosOrchestrator') return 'Copy Blobs';
        if (name === 'copyGoogleStorageToGooglePhotosOrchestrator') return 'Copy Storage';
        if (name === 'copyGooglePhotosToAzureOrchestrator') return 'Copy Photos';
        return name;
    }

    purgeInstance(instanceId: string, event: Event): void {
        event.stopPropagation();
        this.dialog.open(ConfirmDialogComponent, {
            width: '400px',
            data: { title: 'Delete Process', message: 'Delete this process instance?' }
        }).afterClosed().subscribe((confirmed) => {
            if (!confirmed) return;
            this.deletingInstanceIds.add(instanceId);
            this.processService.purgeInstance(instanceId).subscribe({
                next: () => {
                    this.deletingInstanceIds.delete(instanceId);
                    this.instances = this.instances.filter(i => i.instanceId !== instanceId);
                    this.groups = this.buildGroups(this.instances);
                },
                error: () => {
                    this.deletingInstanceIds.delete(instanceId);
                }
            });
        });
    }

    purgeGroup(group: ProcessGroup, event: Event): void {
        event.stopPropagation();
        const allIds = [group.parent.instanceId, ...group.children.map(c => c.instanceId)];
        this.dialog.open(ConfirmDialogComponent, {
            width: '400px',
            data: { title: 'Delete Process Group', message: `Delete this process group (${allIds.length} instances)?` }
        }).afterClosed().subscribe((confirmed) => {
            if (!confirmed) return;
            allIds.forEach(id => this.deletingInstanceIds.add(id));
            forkJoin(allIds.map(id => this.processService.purgeInstance(id))).subscribe({
                next: () => {
                    allIds.forEach(id => this.deletingInstanceIds.delete(id));
                    this.instances = this.instances.filter(i => !allIds.includes(i.instanceId));
                    this.groups = this.buildGroups(this.instances);
                },
                error: () => {
                    allIds.forEach(id => this.deletingInstanceIds.delete(id));
                    this.loadInstances();
                }
            });
        });
    }

    canRetry(group: ProcessGroup): boolean {
        const name = group.parent.name;
        const status = group.parent.runtimeStatus;
        if (name !== 'azureStorageToGooglePhotosOrchestrator' &&
            name !== 'googleStorageToGooglePhotosOrchestrator') return false;
        return status === OrchestrationRuntimeStatus.Failed ||
               status === OrchestrationRuntimeStatus.Terminated;
    }

    retryProcess(group: ProcessGroup, event: Event): void {
        event.stopPropagation();
        const input = this.parseJson(group.parent.serializedInput);
        if (!input) return;

        const albumId    = ((input['albumId']    || input['AlbumId'])    as string) || '';
        const albumTitle = ((input['albumTitle'] || input['AlbumTitle']) as string) || '';
        const rawItems   = ((input['selectedItemsList'] || input['SelectedItemsList']) as any[]) || [];
        let selectedItemsList = rawItems.map((i: any) => ({
            itemPath: i.itemPath || i.ItemPath || '',
            isFolder: i.isFolder ?? i.IsFolder ?? false
        }));

        // Skip files already successfully copied in the previous run
        const output = this.parseJson(group.parent.serializedOutput);
        if (output) {
            const mediaResults = ((output['newMediaItemResults'] ?? output['NewMediaItemResults']) as any[]) || [];
            const succeededNames = new Set<string>(
                mediaResults.filter((r: any) => r.mediaItem?.id).map((r: any) => r.mediaItem.filename as string)
            );
            if (succeededNames.size > 0) {
                selectedItemsList = selectedItemsList.filter(item => {
                    const basename = item.itemPath.includes('/') ? item.itemPath.split('/').pop()! : item.itemPath;
                    return !succeededNames.has(basename);
                });
            }
        }

        this.retryingGroupIds.add(group.parent.instanceId);

        if (group.parent.name === 'azureStorageToGooglePhotosOrchestrator') {
            const accountName   = ((input['accountName']   || input['AccountName'])   as string) || '';
            const containerName = ((input['containerName'] || input['ContainerName']) as string) || '';

            forkJoin({
                azureToken: this.oidcService.getAccessToken('azure-storage').pipe(first()),
                googleUser: this.oidcService.getUserData('google').pipe(first()),
                azureUser:  this.oidcService.getUserData('azure').pipe(first())
            }).pipe(
                switchMap(({ azureToken, googleUser, azureUser }) => {
                    const emails: string[] = [];
                    if (googleUser?.['email'])             emails.push(`google:${googleUser['email']}`);
                    if (azureUser?.['preferred_username']) emails.push(`azure:${azureUser['preferred_username']}`);
                    else if (azureUser?.['email'])         emails.push(`azure:${azureUser['email']}`);

                    return this.processService.startMigration({
                        albumId, albumTitle, selectedItemsList,
                        accountName, containerName,
                        azureAccessToken: azureToken,
                        startedBy: emails.join('|')
                    });
                })
            ).subscribe({
                next: () => {
                    this.retryingGroupIds.delete(group.parent.instanceId);
                    this.loadInstances();
                },
                error: () => {
                    this.retryingGroupIds.delete(group.parent.instanceId);
                    this.error = 'Failed to retry. Please try again.';
                }
            });

        } else {
            const bucketName = ((input['bucketName'] || input['BucketName']) as string) || '';

            this.oidcService.getUserData('google').pipe(first()).subscribe({
                next: (googleUser: any) => {
                    const startedBy = googleUser?.email ? `google:${googleUser.email}` : '';
                    this.processService.startGoogleStorageToGooglePhotos({
                        albumId, albumTitle, selectedItemsList, bucketName, startedBy
                    }).subscribe({
                        next: () => {
                            this.retryingGroupIds.delete(group.parent.instanceId);
                            this.loadInstances();
                        },
                        error: () => {
                            this.retryingGroupIds.delete(group.parent.instanceId);
                            this.error = 'Failed to retry. Please try again.';
                        }
                    });
                }
            });
        }
    }

    private buildGroups(instances: OrchestrationInstance[]): ProcessGroup[] {
        // Sort newest first
        const sorted = [...instances].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const parents = sorted.filter(i => PARENT_NAMES.has(i.name));
        const children = sorted.filter(i => CHILD_NAMES.has(i.name));
        const other = sorted.filter(i => !PARENT_NAMES.has(i.name) && !CHILD_NAMES.has(i.name));
        const usedChildIds = new Set<string>();

        const groups: ProcessGroup[] = parents.map((parent) => {
            const parentTime = new Date(parent.createdAt).getTime();
            const matched = children.filter((child) => {
                if (usedChildIds.has(child.instanceId)) return false;
                // Match by instanceId prefix (durable functions pattern) or creation time proximity
                if (child.instanceId.startsWith(parent.instanceId)) return true;
                const childTime = new Date(child.createdAt).getTime();
                return Math.abs(childTime - parentTime) < 60000;
            });
            matched.forEach(c => usedChildIds.add(c.instanceId));
            return { parent, children: matched };
        });

        // Unmatched children and other instances become standalone groups
        children.filter(c => !usedChildIds.has(c.instanceId)).forEach((c) => {
            groups.push({ parent: c, children: [] });
        });
        other.forEach((o) => {
            groups.push({ parent: o, children: [] });
        });

        // Sort groups by parent's createdAt descending
        groups.sort((a, b) =>
            new Date(b.parent.createdAt).getTime() - new Date(a.parent.createdAt).getTime()
        );

        return groups;
    }

    private startAutoRefresh(): void {
        this.refreshTimer = setInterval(() => {
            const hasActive = this.instances.some(i =>
                i.runtimeStatus === OrchestrationRuntimeStatus.Running ||
                i.runtimeStatus === OrchestrationRuntimeStatus.Pending
            );
            if (hasActive) {
                this.loadInstances();
            }
        }, 5000);
    }

    private stopAutoRefresh(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    private formatDate(date: Date): string {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    private extractError(error: unknown): string {
        if (error && typeof error === 'object' && 'status' in error) {
            const httpError = error as { status: number; message?: string };
            if (httpError.status === 401 || httpError.status === 403) {
                return 'Not authorized. Please check your Google connection.';
            }
            if (httpError.status === 0) {
                return 'Unable to connect to the server.';
            }
        }
        return 'Failed to load processes.';
    }
}

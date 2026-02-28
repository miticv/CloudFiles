import { Component, OnInit, OnDestroy } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
    ProcessService,
    OrchestrationInstance,
    OrchestrationRuntimeStatus,
    ProcessListParams
} from 'app/core/services/process.service';

export interface ProcessGroup {
    parent: OrchestrationInstance;
    children: OrchestrationInstance[];
}

const PARENT_NAMES = new Set([
    'azureStorageToGooglePhotosOrchestrator',
    'gooleStorageToGooglePhotosOrchestrator'
]);

const CHILD_NAMES = new Set([
    'copyAzureBlobsToGooglePhotosOrchestrator',
    'copyGoogleStorageToGooglePhotosOrchestrator'
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

    constructor(private processService: ProcessService) {}

    ngOnInit(): void {
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
        this.processService.listInstances(params).subscribe({
            next: (data) => {
                this.instances = data;
                this.groups = this.buildGroups(data);
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
        const input = this.parseJson(instance.serializedInput);
        if (!input) return '';
        const items = input['SelectedItemsList'] as unknown[] | undefined;
        return items ? `${items.length} items` : '';
    }

    getStartedBy(instance: OrchestrationInstance): string {
        const input = this.parseJson(instance.serializedInput);
        if (!input) return '';
        return (input['StartedBy'] as string) || '';
    }

    getChildFiles(child: OrchestrationInstance): { name: string; path: string; isImage: boolean }[] {
        const input = this.parseJson(child.serializedInput);
        if (!input) return [];
        const items = input['ListItemsPrepared'] as { ItemFilename?: string; ItemPath?: string }[] | undefined;
        if (!items) return [];
        const imageExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif', 'tiff', 'tif', 'svg']);
        return items.map((i) => {
            const name = i.ItemFilename || i.ItemPath || 'unknown';
            const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
            return { name, path: i.ItemPath || '', isImage: imageExts.has(ext) };
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

    getDisplayName(name: string): string {
        if (name === 'azureStorageToGooglePhotosOrchestrator') return 'Azure to Google Photos';
        if (name === 'gooleStorageToGooglePhotosOrchestrator') return 'Google Storage to Photos';
        if (name === 'copyAzureBlobsToGooglePhotosOrchestrator') return 'Copy Blobs';
        if (name === 'copyGoogleStorageToGooglePhotosOrchestrator') return 'Copy Storage';
        return name;
    }

    purgeInstance(instanceId: string, event: Event): void {
        event.stopPropagation();
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
    }

    purgeGroup(group: ProcessGroup, event: Event): void {
        event.stopPropagation();
        const allIds = [group.parent.instanceId, ...group.children.map(c => c.instanceId)];
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

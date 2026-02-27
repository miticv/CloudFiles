import { Component, OnInit, OnDestroy } from '@angular/core';
import {
    ProcessService,
    OrchestrationInstance,
    OrchestrationRuntimeStatus,
    ProcessListParams
} from 'app/core/services/process.service';

@Component({
    standalone: false,
    selector: 'app-processes',
    templateUrl: './processes.component.html',
    styleUrls: ['./processes.component.scss']
})
export class ProcessesComponent implements OnInit, OnDestroy {
    instances: OrchestrationInstance[] = [];
    loading = false;
    error: string | null = null;
    statusFilter: number[] = [];
    expandedInstanceId: string | null = null;
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

    toggleExpand(instance: OrchestrationInstance): void {
        this.expandedInstanceId =
            this.expandedInstanceId === instance.instanceId ? null : instance.instanceId;
    }

    parseJson(serialized: string): unknown {
        if (!serialized) return null;
        try { return JSON.parse(serialized); } catch { return null; }
    }

    getInputSummary(instance: OrchestrationInstance): string {
        const input = this.parseJson(instance.serializedInput) as Record<string, unknown> | null;
        if (!input) return '';
        const items = input['SelectedItemsList'] as unknown[] | undefined;
        return items ? `${items.length} items` : '';
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

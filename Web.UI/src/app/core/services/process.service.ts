import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from './http.service';

export interface MigrationItem {
    itemPath: string;
    isFolder: boolean;
}

export interface StartMigrationRequest {
    albumId: string;
    albumTitle: string;
    selectedItemsList: MigrationItem[];
    accountName: string;
    containerName: string;
    azureAccessToken: string;
    startedBy: string;
}

export interface StartJobResponse {
    id: string;
    statusQueryGetUri: string;
    sendEventPostUri: string;
    terminatePostUri: string;
    purgeHistoryDeleteUri: string;
    restartPostUri: string;
}

export interface OrchestrationInstance {
    name: string;
    instanceId: string;
    runtimeStatus: OrchestrationRuntimeStatus;
    createdAt: string;
    lastUpdatedAt: string;
    serializedInput: string;
    serializedOutput: string;
    serializedCustomStatus: string;
}

export enum OrchestrationRuntimeStatus {
    Running = 0,
    Completed = 1,
    ContinuedAsNew = 2,
    Failed = 3,
    Canceled = 4,
    Terminated = 5,
    Pending = 6
}

export interface ProcessListParams {
    pageSize?: number;
    from?: string;
    to?: string;
    statusList?: number[];
}

@Injectable({ providedIn: 'root' })
export class ProcessService extends HttpService {
    constructor(http: HttpClient) {
        super(http);
    }

    startMigration(request: StartMigrationRequest): Observable<StartJobResponse> {
        return this.http.post<StartJobResponse>(
            `${this.baseUrl}process/AzureStorageToGooglePhotos/start`,
            request,
            this.getRequestOptions(true)
        );
    }

    purgeInstance(instanceId: string): Observable<{ instanceId: string; purged: boolean }> {
        return this.http.delete<{ instanceId: string; purged: boolean }>(
            `${this.baseUrl}process/instances/${instanceId}`,
            this.getRequestOptions(true)
        );
    }

    listInstances(params?: ProcessListParams): Observable<OrchestrationInstance[]> {
        let httpParams = new HttpParams();
        if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());
        if (params?.from) httpParams = httpParams.set('from', params.from);
        if (params?.to) httpParams = httpParams.set('to', params.to);
        if (params?.statusList?.length) httpParams = httpParams.set('statusList', params.statusList.join(','));

        return this.http.get<OrchestrationInstance[]>(
            `${this.baseUrl}process/instances`,
            { ...this.getRequestOptions(true), params: httpParams }
        );
    }
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from './http.service';

export interface AzureSubscription {
    id: string;
    subscriptionId: string;
    displayName: string;
    tenantId: string;
    state: string;
}

export interface AzureResourceGroup {
    id: string;
    name: string;
    location: string;
}

export interface AzureStorageAccount {
    id: string;
    name: string;
    type: string;
    location: string;
    creationTime: string;
    accessTier: string;
}

export interface AzureContainer {
    id: string;
    name: string;
    lastModifiedTime: string;
}

@Injectable({ providedIn: 'root' })
export class AzureBrowseService extends HttpService {
    constructor(http: HttpClient) {
        super(http);
    }

    listSubscriptions(): Observable<AzureSubscription[]> {
        return this.http.get<AzureSubscription[]>(
            `${this.baseUrl}azure/subscription/list`,
            this.getRequestOptions(true)
        );
    }

    listResourceGroups(subscriptionId: string): Observable<AzureResourceGroup[]> {
        return this.http.get<AzureResourceGroup[]>(
            `${this.baseUrl}azure/subscription/${subscriptionId}/list`,
            this.getRequestOptions(true)
        );
    }

    listStorageAccounts(subscriptionId: string, resourceGroup: string): Observable<AzureStorageAccount[]> {
        return this.http.get<AzureStorageAccount[]>(
            `${this.baseUrl}azure/subscription/${subscriptionId}/ResourceGroup/${resourceGroup}/list`,
            this.getRequestOptions(true)
        );
    }

    listContainers(subscriptionId: string, resourceGroup: string, accountName: string): Observable<AzureContainer[]> {
        return this.http.get<AzureContainer[]>(
            `${this.baseUrl}azure/subscription/${subscriptionId}/ResourceGroup/${resourceGroup}/accountName/${accountName}/list`,
            this.getRequestOptions(true)
        );
    }

    assignStorageRole(
        subscriptionId: string, resourceGroup: string, accountName: string, role?: 'reader' | 'contributor'
    ): Observable<{ success: boolean; alreadyAssigned: boolean }> {
        const roleParam = role ? `?role=${role}` : '';
        return this.http.post<{ success: boolean; alreadyAssigned: boolean }>(
            `${this.baseUrl}azure/subscription/${subscriptionId}/ResourceGroup/${resourceGroup}/accountName/${accountName}/assignRole${roleParam}`,
            {},
            this.getRequestOptions(true)
        );
    }

    checkStorageRole(subscriptionId: string, resourceGroup: string, accountName: string, role?: 'reader' | 'contributor'): Observable<{ hasRole: boolean }> {
        const roleParam = role ? `?role=${role}` : '';
        return this.http.get<{ hasRole: boolean }>(
            `${this.baseUrl}azure/subscription/${subscriptionId}/ResourceGroup/${resourceGroup}/accountName/${accountName}/checkRole${roleParam}`,
            this.getRequestOptions(true)
        );
    }

    probeContainerAccess(accountName: string, containerName: string): Observable<{ hasAccess: boolean }> {
        return this.http.get<{ hasAccess: boolean }>(
            `${this.baseUrl}azure/files/probe?account=${accountName}&container=${containerName}`,
            this.getRequestOptions(true)
        );
    }
}

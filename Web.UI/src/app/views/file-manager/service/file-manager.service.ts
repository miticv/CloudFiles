import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HttpService } from 'app/core/services/http.service';
import { Observable } from 'rxjs';
import { FileDetail } from '../model/FileDetail';
import { FileItem } from '../model/FileItem';

export interface StorageContext {
    provider: 'azure' | 'google';
    account?: string;
    container?: string;
}

@Injectable({
    providedIn: 'root'
})
export class FileManagerService extends HttpService {
    constructor(http: HttpClient) {
        super(http);
    }

    public getFolder(path: string, context: StorageContext = { provider: 'azure' }): Observable<FileItem[]> {
        const base = context.provider === 'google' ? 'google/files/list' : 'azure/files/list';
        const url = `${this.baseUrl}${base}${this.buildQueryParams(path, context)}`;
        return this.http.get<FileItem[]>(url, this.getRequestOptions(true));
    }

    public getFile(path: string, context: StorageContext = { provider: 'azure' }): Observable<FileDetail> {
        const base = context.provider === 'google' ? 'google/files/json' : 'azure/files/json';
        const url = `${this.baseUrl}${base}${this.buildQueryParams(path, context)}`;
        return this.http.get<FileDetail>(url, this.getRequestOptions(true));
    }

    private buildQueryParams(path: string, context: StorageContext): string {
        const params: string[] = [];
        if (path) {
            params.push('path=' + encodeURIComponent(path));
        }
        if (context.account) {
            params.push('account=' + encodeURIComponent(context.account));
        }
        if (context.container) {
            params.push('container=' + encodeURIComponent(context.container));
        }
        return params.length > 0 ? '?' + params.join('&') : '';
    }
}

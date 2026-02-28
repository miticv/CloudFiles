import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from './http.service';
import { FileItem } from 'app/views/file-manager/model/FileItem';

export interface GoogleBucketItem {
    name: string;
    location: string;
    storageClass: string;
    timeCreated: string;
}

@Injectable({ providedIn: 'root' })
export class GoogleStorageService extends HttpService {
    constructor(http: HttpClient) {
        super(http);
    }

    listBuckets(projectId: string): Observable<GoogleBucketItem[]> {
        return this.http.get<GoogleBucketItem[]>(
            `${this.baseUrl}google/storage/buckets?projectId=${encodeURIComponent(projectId)}`,
            this.getRequestOptions(true)
        );
    }

    listFiles(bucket: string, path?: string): Observable<FileItem[]> {
        const params: string[] = [`bucket=${encodeURIComponent(bucket)}`];
        if (path) {
            params.push(`path=${encodeURIComponent(path)}`);
        }
        return this.http.get<FileItem[]>(
            `${this.baseUrl}google/files/list?${params.join('&')}`,
            this.getRequestOptions(true)
        );
    }
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from './http.service';

export interface GoogleDriveFile {
    id: string;
    name: string;
    mimeType: string;
    size: number | null;
    modifiedTime: string;
    iconLink: string;
    isFolder: boolean;
}

export interface GoogleDriveFileListResponse {
    nextPageToken: string | null;
    files: GoogleDriveFile[];
}

@Injectable({ providedIn: 'root' })
export class GoogleDriveService extends HttpService {
    constructor(http: HttpClient) {
        super(http);
    }

    listFiles(folderId: string = 'root', pageToken?: string): Observable<GoogleDriveFileListResponse> {
        const params: string[] = [`folderId=${encodeURIComponent(folderId)}`];
        if (pageToken) {
            params.push(`pageToken=${encodeURIComponent(pageToken)}`);
        }
        return this.http.get<GoogleDriveFileListResponse>(
            `${this.baseUrl}google/drive/files?${params.join('&')}`,
            this.getRequestOptions(true)
        );
    }
}

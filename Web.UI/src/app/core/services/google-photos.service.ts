import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HttpService } from './http.service';

export interface PollingConfig {
    pollInterval: string;
    timeoutIn: string;
}

export interface PickingSession {
    id: string;
    pickerUri: string;
    pollingConfig: PollingConfig;
    mediaItemsSet: boolean;
    expireTime: string;
}

export interface MediaFile {
    baseUrl: string;
    mimeType: string;
    filename: string;
}

export interface PickedMediaItem {
    id: string;
    createTime: string;
    type: string;
    mediaFile: MediaFile;
}

export interface PickedMediaItemsResponse {
    mediaItems: PickedMediaItem[];
    nextPageToken: string;
}

@Injectable({ providedIn: 'root' })
export class GooglePhotosService extends HttpService {
    constructor(http: HttpClient) {
        super(http);
    }

    createSession(): Observable<PickingSession> {
        return this.http.post<PickingSession>(
            `${this.baseUrl}google/photos/sessions`,
            {},
            this.getRequestOptions(true)
        );
    }

    pollSession(sessionId: string): Observable<PickingSession> {
        return this.http.get<PickingSession>(
            `${this.baseUrl}google/photos/sessions/${encodeURIComponent(sessionId)}`,
            this.getRequestOptions(true)
        );
    }

    listPickedItems(sessionId: string): Observable<PickedMediaItem[]> {
        return this.http.get<PickedMediaItemsResponse>(
            `${this.baseUrl}google/photos/sessions/${encodeURIComponent(sessionId)}/media`,
            this.getRequestOptions(true)
        ).pipe(map(res => res.mediaItems || []));
    }

    deleteSession(sessionId: string): Observable<void> {
        return this.http.delete<void>(
            `${this.baseUrl}google/photos/sessions/${encodeURIComponent(sessionId)}`,
            this.getRequestOptions(true)
        );
    }

    getImageProxyUrl(baseUrl: string, width: number, height: number): string {
        const sizedUrl = `${baseUrl}=w${width}-h${height}-c`;
        return `${this.baseUrl}google/photos/image?url=${encodeURIComponent(sizedUrl)}`;
    }
}

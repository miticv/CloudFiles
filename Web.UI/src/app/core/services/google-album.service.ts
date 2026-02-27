import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HttpService } from './http.service';

export interface GoogleAlbum {
    id: string;
    title: string;
    productUrl?: string;
    mediaItemsCount?: string;
    coverPhotoBaseUrl?: string;
}

export interface AlbumListResponse {
    albums: GoogleAlbum[];
    nextPageToken?: string;
}

@Injectable({ providedIn: 'root' })
export class GoogleAlbumService extends HttpService {
    constructor(http: HttpClient) {
        super(http);
    }

    listAlbums(): Observable<GoogleAlbum[]> {
        return this.http.get<AlbumListResponse>(
            `${this.baseUrl}google/album/list`,
            this.getRequestOptions(true)
        ).pipe(map(res => res.albums || []));
    }

    createAlbum(title: string): Observable<GoogleAlbum> {
        return this.http.post<GoogleAlbum>(
            `${this.baseUrl}google/album`,
            { title },
            this.getRequestOptions(true)
        );
    }
}

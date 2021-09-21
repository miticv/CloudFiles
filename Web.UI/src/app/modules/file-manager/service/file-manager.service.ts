
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HttpService } from 'app/service/http.service';
import { Observable } from 'rxjs';
import { FileDetail } from '../model/FileDetail';

import { FileItem } from '../model/FileItem';


@Injectable({
    providedIn: 'root'
})
export class FileManagerService extends HttpService {
    constructor(http: HttpClient) {
        super(http);
    }

    public getFolder(path: string): Observable<any> {
        let url = `${this.baseUrl}azure/miticv/file/list`;
        url = url + this.getUrlPath(path);
        return this.http.get<FileItem[]>(url, this.getRequestOptions(true));
    }

    public getFile(path: string): Observable<any> {
        let url = `${this.baseUrl}/azure/miticv/json/item`;
        url = url + this.getUrlPath(path);
        return this.http.get<FileDetail>(url, this.getRequestOptions(true));
    }

    private getUrlPath(path: string): string {
        if (!!path && path) {
            return '?path=' + encodeURIComponent(path);
        }
        return '';
    }
}

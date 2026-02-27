import { environment } from 'environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class HttpService {
    baseUrl: string;

    constructor(public http: HttpClient) {
        this.baseUrl = environment.api;
    }

    public getRequestOptions(noErrorHandle: boolean = false): { headers: HttpHeaders; observe: 'body'; responseType: 'json' } {
        let headers: HttpHeaders = new HttpHeaders();
        headers = headers.append('Accept', 'application/json');
        headers = headers.append('Content-Type', 'application/json');

        if (noErrorHandle) {
            headers = headers.append('No-Error-Handle', 'true');
        }

        return {
            headers,
            observe: 'body',
            responseType: 'json'
        };
    }
}

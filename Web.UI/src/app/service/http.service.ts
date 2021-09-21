import { environment } from 'environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';


@Injectable({
    providedIn: 'root'
})
export class HttpService {
    headers: Headers;
    baseUrl: string;

    constructor(public http: HttpClient) {
        this.baseUrl = environment.api;
    }


    public getRequestOptions(noErrorHandle: boolean = false): any {
        let headers: HttpHeaders = new HttpHeaders();
        headers = headers.append('Accept', 'application/json');
        headers = headers.append('Content-Type', 'application/json');

        if (noErrorHandle) {
            headers = headers.append('No-Error-Handle', 'true');
        }

        const options: any = {
            headers,
            observe: 'body',
            responseType: 'json'
        };

        return options;
    }

}



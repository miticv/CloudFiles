import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from './http.service';

export interface UserDto {
    email: string;
    displayName: string;
    authProvider: string;
    createdAt: string;
    lastLoginAt: string;
    isApproved: boolean;
    isActive: boolean;
    partitionKey: string;
    rowKey: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService extends HttpService {

    constructor(http: HttpClient) {
        super(http);
    }

    listUsers(): Observable<UserDto[]> {
        return this.http.get<UserDto[]>(`${this.baseUrl}manage/users`, this.getRequestOptions());
    }

    updateUser(partitionKey: string, rowKey: string, data: { isActive: boolean; isApproved: boolean }): Observable<{ success: boolean }> {
        return this.http.put<{ success: boolean }>(`${this.baseUrl}manage/users/${partitionKey}/${rowKey}`, data, this.getRequestOptions());
    }
}

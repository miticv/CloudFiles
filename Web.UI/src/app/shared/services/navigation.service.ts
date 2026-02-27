import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface IMenuItem {
    type: 'link' | 'separator';
    name?: string;
    state?: string;
    icon?: string;
}

@Injectable({ providedIn: 'root' })
export class NavigationService {
    menuItems = new BehaviorSubject<IMenuItem[]>([
        {
            name: 'Storage Browser',
            type: 'link',
            icon: 'storage',
            state: 'storage-browser'
        },
        {
            name: 'Google Photos',
            type: 'link',
            icon: 'photo_library',
            state: 'google-photos'
        },
        {
            name: 'Processes',
            type: 'link',
            icon: 'sync',
            state: 'processes'
        },
        {
            type: 'separator',
            name: 'Account'
        },
        {
            name: 'Connections',
            type: 'link',
            icon: 'link',
            state: 'sessions/signin'
        }
    ]);

    menuItems$ = this.menuItems.asObservable();
}

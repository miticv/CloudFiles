import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from 'app/core/services/auth.service';

export interface IMenuItem {
    type: 'link' | 'separator';
    name?: string;
    state?: string;
    icon?: string;
}

@Injectable({ providedIn: 'root' })
export class NavigationService {
    menuItems = new BehaviorSubject<IMenuItem[]>([]);
    menuItems$ = this.menuItems.asObservable();

    private baseItems: IMenuItem[] = [
        {
            name: 'Storage Browser',
            type: 'link',
            icon: 'storage',
            state: 'storage-browser'
        },
        {
            name: 'Google Storage',
            type: 'link',
            icon: 'cloud_circle',
            state: 'google-storage'
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
    ];

    private adminItems: IMenuItem[] = [
        {
            type: 'separator',
            name: 'Admin'
        },
        {
            name: 'User Management',
            type: 'link',
            icon: 'people',
            state: 'admin/users'
        }
    ];

    constructor(private authService: AuthService) {
        this.authService.user$.subscribe((user) => {
            this.updateMenu(user?.isAdmin ?? false);
        });
    }

    private updateMenu(isAdmin: boolean) {
        const items = [...this.baseItems];
        if (isAdmin) {
            items.push(...this.adminItems);
        }
        this.menuItems.next(items);
    }
}

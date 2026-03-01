import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, combineLatest, takeUntil } from 'rxjs';
import { AuthService } from 'app/core/services/auth.service';
import { MultiAuthService } from 'app/core/auth/multi-auth.service';

export interface ConnectionStatus {
    configId: string;
    label: string;
    connected: boolean;
}

export interface IMenuItem {
    type: 'link' | 'separator';
    name?: string;
    state?: string;
    icon?: string;
    connectionStatuses?: ConnectionStatus[];
}

@Injectable({ providedIn: 'root' })
export class NavigationService implements OnDestroy {
    menuItems = new BehaviorSubject<IMenuItem[]>([]);
    menuItems$ = this.menuItems.asObservable();

    private destroy$ = new Subject<void>();

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
            state: 'connections'
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

    constructor(
        private authService: AuthService,
        private multiAuthService: MultiAuthService
    ) {
        combineLatest([
            this.authService.user$,
            this.multiAuthService.watchAuthStatus()
        ]).pipe(takeUntil(this.destroy$)).subscribe(([user, statuses]) => {
            const isAdmin = user?.isAdmin ?? false;
            const connectionStatuses: ConnectionStatus[] = statuses
                .filter(s => s.configId === 'google' || s.configId === 'azure')
                .map(s => ({
                    configId: s.configId,
                    label: s.configId === 'google' ? 'Google' : 'Azure',
                    connected: s.authenticated
                }));
            this.updateMenu(isAdmin, connectionStatuses);
        });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private updateMenu(isAdmin: boolean, connectionStatuses: ConnectionStatus[]) {
        const items = this.baseItems.map((item) => {
            if (item.state === 'connections') {
                return { ...item, connectionStatuses };
            }
            return item;
        });
        if (isAdmin) {
            items.push(...this.adminItems);
        }
        this.menuItems.next(items);
    }
}

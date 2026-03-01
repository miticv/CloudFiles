import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { Subscription } from 'rxjs';
import { NavigationService, IMenuItem } from '../../../services/navigation.service';
import { MultiAuthService } from 'app/core/auth/multi-auth.service';
import { AuthService } from 'app/core/services/auth.service';

@Component({
    selector: 'app-admin-layout',
    templateUrl: './admin-layout.component.html',
    styleUrls: ['./admin-layout.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        MatSidenavModule,
        MatToolbarModule,
        MatListModule,
        MatIconModule,
        MatButtonModule,
        MatMenuModule
    ]
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
    menuItems: IMenuItem[] = [];
    private menuSub: Subscription;
    sidebarOpen = true;

    constructor(
        private navService: NavigationService,
        private multiAuth: MultiAuthService,
        private authService: AuthService,
        private router: Router
    ) {}

    ngOnInit() {
        this.menuSub = this.navService.menuItems$.subscribe((items) => {
            this.menuItems = items;
        });
    }

    ngOnDestroy() {
        if (this.menuSub) {
            this.menuSub.unsubscribe();
        }
    }

    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
    }

    signOut() {
        this.authService.clearSession();
        this.multiAuth.logoutAll();
        this.router.navigateByUrl('/sessions/login');
    }
}

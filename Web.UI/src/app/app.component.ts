import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, first } from 'rxjs/operators';
import { RoutePartsService } from './shared/services/route-parts.service';
import { UILibIconService } from './shared/services/ui-lib-icon.service';
import { MultiAuthService } from './core/auth/multi-auth.service';

@Component({
    selector: 'app-root',
    template: '<router-outlet></router-outlet>',
    standalone: true,
    imports: [CommonModule, RouterModule]
})
export class AppComponent implements OnInit {
    appTitle = 'CloudFiles';

    constructor(
        private title: Title,
        private router: Router,
        private activeRoute: ActivatedRoute,
        private routePartsService: RoutePartsService,
        private iconService: UILibIconService,
        private multiAuthService: MultiAuthService
    ) {
        iconService.init();
    }

    ngOnInit() {
        this.changePageTitle();
        this.checkAuth();
    }

    private checkAuth() {
        // Auth callback is already processed by withAppInitializerAuthCheck() before routing.
        // Use isAuthenticated$ (via watchAuthStatus) which has the correct state immediately.
        this.multiAuthService.watchAuthStatus().pipe(first()).subscribe(statuses => {
            const anyAuthenticated = statuses.some(s => s.authenticated);
            if (!anyAuthenticated) {
                const currentPath = window.location.pathname;
                if (!currentPath.startsWith('/sessions')) {
                    if (!localStorage.getItem('redirect')) {
                        localStorage.setItem('redirect', JSON.stringify(currentPath));
                    }
                    this.router.navigateByUrl('/sessions/signin');
                }
            } else {
                this.navigateToStoredEndpoint();
            }
        });
    }

    private navigateToStoredEndpoint() {
        const data = localStorage.getItem('redirect');
        if (data) {
            const redirect = JSON.parse(data);
            if (redirect && redirect !== '/') {
                localStorage.removeItem('redirect');
                this.router.navigateByUrl(redirect);
            }
        }
    }

    private changePageTitle() {
        this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
            const routeParts = this.routePartsService.generateRouteParts(this.activeRoute.snapshot);
            if (!routeParts.length) {
                return this.title.setTitle(this.appTitle);
            }
            const pageTitle = routeParts
                .reverse()
                .map((part) => part.title)
                .reduce((partA, partI) => `${partA} > ${partI}`);
            this.title.setTitle(`${pageTitle} | ${this.appTitle}`);
        });
    }
}

import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, first } from 'rxjs/operators';
import { RoutePartsService } from './shared/services/route-parts.service';
import { UILibIconService } from './shared/services/ui-lib-icon.service';
import { MultiAuthService } from './core/auth/multi-auth.service';
import { AuthService } from './core/services/auth.service';

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
        private multiAuthService: MultiAuthService,
        private authService: AuthService
    ) {
        iconService.init();
    }

    ngOnInit() {
        this.changePageTitle();
        this.checkAuth();
    }

    private checkAuth() {
        const currentPath = window.location.pathname + window.location.search;

        // Don't redirect if already on public pages
        if (currentPath.startsWith('/sessions/login') || currentPath.startsWith('/privacy') || currentPath.startsWith('/terms')) {
            return;
        }

        // If returning from OAuth redirect with pending flag, don't interfere
        if (this.authService.getOAuthPending()) {
            return;
        }

        // First check: do we have a CloudFiles session (our app JWT)?
        if (!this.authService.isLoggedIn()) {
            if (!currentPath.startsWith('/sessions')) {
                if (!localStorage.getItem('redirect')) {
                    localStorage.setItem('redirect', JSON.stringify(currentPath));
                }
            }
            this.router.navigateByUrl('/sessions/login');
            return;
        }

        // Second check: OIDC providers
        this.multiAuthService.watchAuthStatus().pipe(first()).subscribe((statuses) => {
            const anyAuthenticated = statuses.some(s => s.authenticated);
            if (!anyAuthenticated) {
                if (!currentPath.startsWith('/sessions') && !currentPath.startsWith('/connections')) {
                    if (!localStorage.getItem('redirect')) {
                        localStorage.setItem('redirect', JSON.stringify(currentPath));
                    }
                    this.router.navigateByUrl('/connections');
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
                .map(part => part.title)
                .reduce((partA, partI) => `${partA} > ${partI}`);
            this.title.setTitle(`${pageTitle} | ${this.appTitle}`);
        });
    }
}

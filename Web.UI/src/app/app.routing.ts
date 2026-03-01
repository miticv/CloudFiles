import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './shared/components/layouts/admin-layout/admin-layout.component';
import { AuthLayoutComponent } from './shared/components/layouts/auth-layout/auth-layout.component';
import { AuthGuard } from './core/auth/auth.guard';
import { AdminGuard } from './core/auth/admin.guard';

export const rootRouterConfig: Routes = [
    {
        path: '',
        redirectTo: 'file-manager',
        pathMatch: 'full'
    },
    {
        path: '',
        component: AuthLayoutComponent,
        children: [
            {
                path: 'sessions',
                loadChildren: () => import('./views/sessions/sessions.module').then(m => m.SessionsModule),
                data: { title: 'Session' }
            },
            {
                path: 'privacy',
                loadComponent: () => import('./views/legal/privacy-statement.component').then(c => c.PrivacyStatementComponent),
                data: { title: 'Privacy Policy' }
            },
            {
                path: 'terms',
                loadComponent: () => import('./views/legal/terms-of-service.component').then(c => c.TermsOfServiceComponent),
                data: { title: 'Terms of Service' }
            }
        ]
    },
    {
        path: '',
        component: AdminLayoutComponent,
        canActivate: [AuthGuard],
        children: [
            {
                path: 'file-manager',
                loadChildren: () => import('./views/file-manager/file-manager.module').then(m => m.FileManagerModule),
                data: { title: 'File Manager', breadcrumb: 'FILE MANAGER' }
            },
            {
                path: 'storage-browser',
                loadChildren: () => import('./views/storage-browser/storage-browser.module').then(m => m.StorageBrowserModule),
                data: { title: 'Storage Browser', breadcrumb: 'STORAGE BROWSER' }
            },
            {
                path: 'google-storage',
                loadChildren: () => import('./views/google-storage-browser/google-storage-browser.module').then(m => m.GoogleStorageBrowserModule),
                data: { title: 'Google Storage', breadcrumb: 'GOOGLE STORAGE' }
            },
            {
                path: 'google-photos',
                loadChildren: () => import('./views/google-photos/google-photos.module').then(m => m.GooglePhotosModule),
                data: { title: 'Google Photos', breadcrumb: 'GOOGLE PHOTOS' }
            },
            {
                path: 'processes',
                loadChildren: () => import('./views/processes/processes.module').then(m => m.ProcessesModule),
                data: { title: 'Processes', breadcrumb: 'PROCESSES' }
            },
            {
                path: 'admin/users',
                loadComponent: () => import('./views/admin/admin-users.component').then(c => c.AdminUsersComponent),
                canActivate: [AdminGuard],
                data: { title: 'User Management', breadcrumb: 'ADMIN' }
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'sessions/404'
    }
];

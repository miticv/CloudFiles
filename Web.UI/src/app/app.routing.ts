import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './shared/components/layouts/admin-layout/admin-layout.component';
import { AuthLayoutComponent } from './shared/components/layouts/auth-layout/auth-layout.component';
import { AuthGuard } from './core/auth/auth.guard';

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
                path: 'google-photos',
                loadChildren: () => import('./views/google-photos/google-photos.module').then(m => m.GooglePhotosModule),
                data: { title: 'Google Photos', breadcrumb: 'GOOGLE PHOTOS' }
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'sessions/404'
    }
];

import { Routes } from '@angular/router';
import { NotFoundComponent } from './not-found/not-found.component';
import { ErrorComponent } from './error/error.component';

export const SessionsRoutes: Routes = [
    {
        path: '',
        children: [
            {
                path: 'login',
                loadComponent: () => import('./login/login.component').then(c => c.LoginComponent),
                data: { title: 'Login' }
            },
            {
                path: 'signin',
                redirectTo: '/connections',
                pathMatch: 'full'
            },
            {
                path: '404',
                component: NotFoundComponent,
                data: { title: 'Not Found' }
            },
            {
                path: 'error',
                component: ErrorComponent,
                data: { title: 'Error' }
            }
        ]
    }
];

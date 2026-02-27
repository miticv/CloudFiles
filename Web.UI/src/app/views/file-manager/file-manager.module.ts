import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { FileManagerPageComponent } from './file-manager-page/file-manager-page.component';
import { FileDetailComponent } from './file-detail/file-detail.component';
import { FileManagerEffects } from './store/file-manager.effects';
import * as fromStore from './store/file-manager.reducer';

const fileRoutes: Route[] = [
    {
        path: '',
        pathMatch: 'full',
        component: FileManagerPageComponent
    }
];

@NgModule({
    declarations: [
        FileManagerPageComponent,
        FileDetailComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(fileRoutes),
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatSidenavModule,
        MatDialogModule,
        MatProgressSpinnerModule
    ],
    providers: [
        provideState(fromStore.storeFeatureKey, fromStore.reducer),
        provideEffects(FileManagerEffects),
    ]
})
export class FileManagerModule {}

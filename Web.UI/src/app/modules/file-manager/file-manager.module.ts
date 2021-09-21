import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileManagerPageComponent } from './file-manager-page/file-manager-page.component';
import { Route, RouterModule } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import * as fromStore from './store/file-manager.reducer';
import { EffectsModule } from '@ngrx/effects';
import { FileManagerEffects } from './store/file-manager.effects';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSidenavModule } from '@angular/material/sidenav';
import { SharedModule } from 'app/shared/shared.module';
import { MatIconModule } from '@angular/material/icon';
import { FileDetailComponent } from './file-detail/file-detail.component';

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
        StoreModule.forFeature(fromStore.storeFeatureKey, fromStore.reducer),
        EffectsModule.forFeature([FileManagerEffects]),
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatSidenavModule,
        SharedModule
    ]
})
export class FileManagerModule { }

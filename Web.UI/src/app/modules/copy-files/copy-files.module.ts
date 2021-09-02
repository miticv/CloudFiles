import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopyFilesPageComponent } from './copy-files-page/copy-files-page.component';
import { Route, RouterModule } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import * as fromStore from './store/reducers';

const fileRoutes: Route[] = [
    {
        path: '',
        component: CopyFilesPageComponent
    }
];

@NgModule({
    declarations: [
        CopyFilesPageComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(fileRoutes),
        StoreModule.forFeature(fromStore.storeFeatureKey, fromStore.reducers, { metaReducers: fromStore.metaReducers })
    ]
})
export class CopyFilesModule { }

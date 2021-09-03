import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileManagerPageComponent } from './file-manager-page/file-manager-page.component';
import { Route, RouterModule } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import * as fromStore from './store/reducers';

const fileRoutes: Route[] = [
    {
        path: '',
        component: FileManagerPageComponent
    }
];

@NgModule({
    declarations: [
        FileManagerPageComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(fileRoutes),
        StoreModule.forFeature(fromStore.storeFeatureKey, fromStore.reducers, { metaReducers: fromStore.metaReducers })
    ]
})
export class FileManagerModule { }

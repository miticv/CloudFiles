import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AppleDriveComponent } from './apple-drive.component';

const routes: Route[] = [
    {
        path: '',
        component: AppleDriveComponent
    }
];

@NgModule({
    declarations: [AppleDriveComponent],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        MatIconModule
    ]
})
export class AppleDriveModule {}

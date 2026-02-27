import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { StorageBrowserComponent } from './storage-browser.component';

const routes: Route[] = [
    {
        path: '',
        component: StorageBrowserComponent
    }
];

@NgModule({
    declarations: [StorageBrowserComponent],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        MatListModule,
        MatIconModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatDialogModule
    ]
})
export class StorageBrowserModule {}

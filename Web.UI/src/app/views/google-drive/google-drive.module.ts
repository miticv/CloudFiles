import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Route, RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { GoogleDriveComponent } from './google-drive.component';

const routes: Route[] = [
    {
        path: '',
        component: GoogleDriveComponent
    }
];

@NgModule({
    declarations: [GoogleDriveComponent],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(routes),
        MatListModule,
        MatIconModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatCheckboxModule,
        MatDialogModule
    ]
})
export class GoogleDriveModule {}

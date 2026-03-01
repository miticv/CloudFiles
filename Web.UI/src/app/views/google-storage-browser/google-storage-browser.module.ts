import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Route, RouterModule } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { GoogleStorageBrowserComponent } from './google-storage-browser.component';

const routes: Route[] = [
    {
        path: '',
        component: GoogleStorageBrowserComponent
    }
];

@NgModule({
    declarations: [GoogleStorageBrowserComponent],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(routes),
        MatListModule,
        MatIconModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        MatDialogModule
    ]
})
export class GoogleStorageBrowserModule {}

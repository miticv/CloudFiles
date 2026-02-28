import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { GooglePhotosComponent } from './google-photos.component';
import { SecureImageDirective } from './secure-image.directive';

const routes: Route[] = [
    {
        path: '',
        component: GooglePhotosComponent
    }
];

@NgModule({
    declarations: [GooglePhotosComponent, SecureImageDirective],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        MatIconModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatDialogModule
    ]
})
export class GooglePhotosModule {}

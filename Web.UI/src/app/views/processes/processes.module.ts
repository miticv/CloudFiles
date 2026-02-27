import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ProcessesComponent } from './processes.component';

const routes: Route[] = [
    { path: '', component: ProcessesComponent }
];

@NgModule({
    declarations: [ProcessesComponent],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(routes),
        MatIconModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatSelectModule,
        MatFormFieldModule
    ]
})
export class ProcessesModule {}

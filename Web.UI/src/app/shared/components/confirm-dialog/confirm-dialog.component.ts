import { Component, Inject } from '@angular/core';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
    title: string;
    message: string;
}

@Component({
    standalone: true,
    imports: [MatDialogModule, MatIconModule, MatButtonModule],
    selector: 'app-confirm-dialog',
    template: `
        <h2 mat-dialog-title class="flex items-center gap-2">
            <mat-icon class="text-red-500">warning</mat-icon>
            {{data.title}}
        </h2>
        <mat-dialog-content>
            <p class="text-sm text-secondary">{{data.message}}</p>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button (click)="dialogRef.close(false)">Cancel</button>
            <button mat-flat-button color="warn" (click)="dialogRef.close(true)">Delete</button>
        </mat-dialog-actions>
    `
})
export class ConfirmDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ConfirmDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
    ) {}
}

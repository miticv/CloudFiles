import { Component } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
    standalone: true,
    imports: [MatDialogModule, MatIconModule, MatButtonModule],
    selector: 'app-google-photos-help-dialog',
    template: `
        <h2 mat-dialog-title class="flex items-center gap-2">
            <mat-icon class="text-blue-500">help</mat-icon>
            Migrating Google Photos to Azure
        </h2>
        <mat-dialog-content>
            <div class="space-y-4 text-sm leading-relaxed">

                <div>
                    <h3 class="font-semibold text-base mb-1">Two ways to migrate your photos</h3>
                    <p class="text-secondary">
                        You can use the <strong>Photos Picker</strong> on this page to select individual
                        photos, or use <strong>Google Takeout</strong> to export your entire library
                        and then copy from Drive to Azure.
                    </p>
                </div>

                <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h3 class="font-semibold mb-2 flex items-center gap-1">
                        <mat-icon class="text-indigo-600"
                            style="font-size: 18px; width: 18px; height: 18px;">
                            photo_library
                        </mat-icon>
                        Option A: Photos Picker (small batches)
                    </h3>
                    <p class="text-secondary">
                        Use the <strong>"Select Photos"</strong> button above to pick photos
                        from Google Photos, then click <strong>"Copy to Azure"</strong>.
                        Best for smaller selections. You can open the picker multiple times
                        to accumulate selections.
                    </p>
                </div>

                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 class="font-semibold mb-3 flex items-center gap-1">
                        <mat-icon class="text-blue-600"
                            style="font-size: 18px; width: 18px; height: 18px;">
                            inventory_2
                        </mat-icon>
                        Option B: Google Takeout + Drive (full library)
                    </h3>
                    <p class="text-secondary mb-3">
                        For large libraries, Google Takeout exports everything to your
                        Google Drive. Then use the <strong>Google Drive</strong> page in
                        this app to copy the files to Azure.
                    </p>

                    <ol class="list-decimal list-inside space-y-2 text-secondary">
                        <li>
                            Go to <strong>Google Takeout</strong>
                            (<code class="text-xs bg-gray-100 px-1 rounded">takeout.google.com</code>)
                        </li>
                        <li>
                            Deselect all, then select only <strong>"Google Photos"</strong>
                        </li>
                        <li>
                            Choose delivery method: <strong>"Add to Drive"</strong>
                        </li>
                        <li>
                            Select frequency <strong>"Export once"</strong> and file size
                            <strong>50 GB</strong> (recommended)
                        </li>
                        <li>
                            Click <strong>"Create export"</strong> and wait for the email
                            notification (can take hours for large libraries)
                        </li>
                        <li>
                            Once complete, go to the <strong>Google Drive</strong>
                            page in this app
                        </li>
                        <li>
                            Navigate to the <strong>"Takeout"</strong> folder in your Drive
                        </li>
                        <li>
                            Select the photo files and click <strong>"Copy to Azure"</strong>
                        </li>
                    </ol>
                </div>

                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p class="text-secondary flex items-start gap-2">
                        <mat-icon class="text-amber-600 mt-0.5"
                            style="font-size: 18px; width: 18px; height: 18px;">
                            tips_and_updates
                        </mat-icon>
                        <span>
                            Takeout creates ZIP archives. Extract them first, or look for
                            individual photo files within the Takeout folder structure
                            on the Google Drive page.
                        </span>
                    </p>
                </div>

            </div>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-flat-button color="primary" (click)="close()">Got it</button>
        </mat-dialog-actions>
    `
})
export class GooglePhotosHelpDialogComponent {
    constructor(private dialogRef: MatDialogRef<GooglePhotosHelpDialogComponent>) {}

    close(): void {
        this.dialogRef.close();
    }
}

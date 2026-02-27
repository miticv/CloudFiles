import { Component } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
    standalone: true,
    imports: [MatDialogModule, MatIconModule, MatButtonModule],
    selector: 'app-storage-help-dialog',
    template: `
        <h2 mat-dialog-title class="flex items-center gap-2">
            <mat-icon class="text-blue-500">help</mat-icon>
            Azure Storage Access
        </h2>
        <mat-dialog-content>
            <div class="space-y-4 text-sm leading-relaxed">

                <div>
                    <h3 class="font-semibold text-base mb-1">Why can't I see files in a container?</h3>
                    <p class="text-secondary">
                        Even if you can browse subscriptions, resource groups, and storage accounts,
                        you may get an <strong>Access Denied</strong> error when opening a container.
                        This is because browsing resources and reading blob data require
                        <strong>different permissions</strong>.
                    </p>
                </div>

                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 class="font-semibold mb-2 flex items-center gap-1">
                        <mat-icon class="text-blue-600" style="font-size: 18px; width: 18px; height: 18px;">key</mat-icon>
                        Required Role: Storage Blob Data Reader
                    </h3>
                    <p class="text-secondary">
                        To list and view files in a storage container, your Azure AD account needs the
                        <strong>Storage Blob Data Reader</strong> role (or higher) assigned on the
                        storage account. The regular <em>Owner</em>, <em>Contributor</em>, or <em>Reader</em>
                        roles only grant management-plane access &mdash; they do not allow reading blob data.
                    </p>
                </div>

                <div>
                    <h3 class="font-semibold text-base mb-1">How to assign the role</h3>
                    <ol class="list-decimal list-inside space-y-1 text-secondary">
                        <li>Go to the <strong>Azure Portal</strong> &rarr; your Storage Account</li>
                        <li>Click <strong>Access Control (IAM)</strong> in the left menu</li>
                        <li>Click <strong>+ Add</strong> &rarr; <strong>Add role assignment</strong></li>
                        <li>Search for <strong>Storage Blob Data Reader</strong> and select it</li>
                        <li>Click <strong>Members</strong>, then <strong>+ Select members</strong></li>
                        <li>Search for your user account and select it</li>
                        <li>Click <strong>Review + assign</strong></li>
                    </ol>
                </div>

                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p class="text-secondary flex items-start gap-2">
                        <mat-icon class="text-amber-600 mt-0.5" style="font-size: 18px; width: 18px; height: 18px;">schedule</mat-icon>
                        <span>Role assignments can take <strong>up to 5 minutes</strong> to take effect. If you just assigned the role, wait a few minutes and try again.</span>
                    </p>
                </div>

                <div>
                    <h3 class="font-semibold text-base mb-1">Available data-plane roles</h3>
                    <table class="w-full text-secondary text-xs">
                        <thead>
                            <tr class="border-b">
                                <th class="text-left py-1 pr-2">Role</th>
                                <th class="text-left py-1">Permissions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="border-b">
                                <td class="py-1 pr-2 font-medium">Storage Blob Data Reader</td>
                                <td class="py-1">Read blobs and containers</td>
                            </tr>
                            <tr class="border-b">
                                <td class="py-1 pr-2 font-medium">Storage Blob Data Contributor</td>
                                <td class="py-1">Read, write, and delete blobs</td>
                            </tr>
                            <tr>
                                <td class="py-1 pr-2 font-medium">Storage Blob Data Owner</td>
                                <td class="py-1">Full access including POSIX permissions</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            </div>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-flat-button color="primary" (click)="close()">Got it</button>
        </mat-dialog-actions>
    `
})
export class StorageHelpDialogComponent {
    constructor(private dialogRef: MatDialogRef<StorageHelpDialogComponent>) {}

    close(): void {
        this.dialogRef.close();
    }
}

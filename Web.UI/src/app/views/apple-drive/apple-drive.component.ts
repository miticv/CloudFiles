import { Component } from '@angular/core';

@Component({
    standalone: false,
    selector: 'app-apple-drive',
    template: `
        <div class="flex flex-col w-full h-full min-w-0 overflow-auto">
            <div class="flex flex-auto flex-col items-center justify-center py-16">
                <mat-icon class="!text-[80px] !w-20 !h-20 text-black/15">cloud_off</mat-icon>
                <div class="mt-4 text-3xl font-bold tracking-tight text-secondary">Apple iCloud Drive</div>
                <div class="mt-2 text-xl font-semibold text-secondary">Coming Soon</div>
                <div class="mt-4 text-sm text-secondary max-w-md text-center leading-relaxed">
                    Apple does not currently provide a public REST API for iCloud Drive.
                    This feature will be added if and when Apple makes an API available
                    for third-party applications.
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host {
            display: flex;
            flex: 1 1 auto;
            height: 100%;
        }
    `]
})
export class AppleDriveComponent {}

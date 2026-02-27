import { Injectable } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class UILibIconService {
    constructor(
        private matIconRegistry: MatIconRegistry,
        private domSanitizer: DomSanitizer
    ) {}

    init() {
        this.matIconRegistry.addSvgIcon(
            'eg_google',
            this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/google-icon.svg')
        );
    }
}

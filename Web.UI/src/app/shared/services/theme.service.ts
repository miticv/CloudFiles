import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    activateTheme() {
        document.body.classList.add('cloudfiles-theme');
    }
}

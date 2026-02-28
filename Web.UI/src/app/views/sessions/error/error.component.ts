import { Component } from '@angular/core';
import { appAnimations } from 'app/shared/animations/animations';
@Component({
    selector: 'app-error',
    templateUrl: './error.component.html',
    styleUrls: ['./error.component.css'],
    animations: appAnimations,
    standalone: false
})
export class ErrorComponent {
}

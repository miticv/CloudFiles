import { Component } from '@angular/core';
import { appAnimations } from 'app/shared/animations/animations';

@Component({
    selector: 'app-not-found',
    templateUrl: './not-found.component.html',
    styleUrls: ['./not-found.component.scss'],
    animations: appAnimations,
    standalone: false
})
export class NotFoundComponent {
}

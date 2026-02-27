import { Component, OnInit } from '@angular/core';
import { egretAnimations } from 'app/shared/animations/egret-animations';

@Component({
    selector: 'app-not-found',
    templateUrl: './not-found.component.html',
    styleUrls: ['./not-found.component.scss'],
    animations: egretAnimations,
    standalone: false
})
export class NotFoundComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

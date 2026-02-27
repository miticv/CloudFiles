import { Component, OnInit } from '@angular/core';
import { egretAnimations } from 'app/shared/animations/egret-animations';
@Component({
    selector: 'app-error',
    templateUrl: './error.component.html',
    styleUrls: ['./error.component.css'],
    animations: egretAnimations,
    standalone: false
})
export class ErrorComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

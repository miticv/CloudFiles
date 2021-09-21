import { closeDetailDrawer } from './../store/file-manager.actions';
import { FileDetail } from './../model/FileDetail';
import { Component, Input, OnInit } from '@angular/core';
import { FileItem } from '../model/FileItem';
import { Store } from '@ngrx/store';
import { AppState } from 'app/store/reducers';

@Component({
    selector: 'app-file-detail',
    templateUrl: './file-detail.component.html',
    styleUrls: ['./file-detail.component.scss']
})
export class FileDetailComponent implements OnInit {
    @Input() file: FileDetail;
    @Input() fileItem: FileItem;

    constructor(private store: Store<AppState>) { }

    ngOnInit(): void {
    }
    close() {
        this.store.dispatch(closeDetailDrawer());
    }

}

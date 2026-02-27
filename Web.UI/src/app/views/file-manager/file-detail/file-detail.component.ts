import { Component, Input } from '@angular/core';
import { Store } from '@ngrx/store';
import { FileDetail } from '../model/FileDetail';
import { FileItem } from '../model/FileItem';
import { closeDetailDrawer } from '../store/file-manager.actions';

@Component({
    standalone: false,
    selector: 'app-file-detail',
    templateUrl: './file-detail.component.html',
    styleUrls: ['./file-detail.component.scss']
})
export class FileDetailComponent {
    @Input() file: FileDetail | null;
    @Input() fileItem: FileItem;

    constructor(private store: Store) {}

    close() {
        this.store.dispatch(closeDetailDrawer());
    }
}

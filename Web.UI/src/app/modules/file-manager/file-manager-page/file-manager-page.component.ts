import { getCurrentFile, getShowDetail } from './../store/file-manager.selectors';

import { FileItem } from './../model/FileItem';
import { loadFile, loadFolder } from './../store/file-manager.actions';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from 'app/store/reducers';
import { Observable } from 'rxjs';
import { getCurrentPath, getFiles, getFolders } from '../store/file-manager.selectors';
import { MatDrawer } from '@angular/material/sidenav';
import { FileDetail } from '../model/FileDetail';

@Component({
    selector: 'app-file-manager-page',
    templateUrl: './file-manager-page.component.html',
    styleUrls: ['./file-manager-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileManagerPageComponent implements OnInit {
    @ViewChild('matDrawer', { static: true }) matDrawer: MatDrawer;
    drawerMode: 'side' | 'over';

    files$: Observable<FileItem[]>;
    folders$: Observable<FileItem[]>;
    currentPath$: Observable<string[]>;
    currentFile$: Observable<FileDetail>;
    showDetail$: Observable<boolean>;
    currentFileItem: FileItem;

    constructor(private store: Store<AppState>) { }

    ngOnInit(): void {
        this.store.dispatch(loadFolder({ path: null }));
        this.files$ = this.store.select(getFiles);
        this.folders$ = this.store.select(getFolders);
        this.currentPath$ = this.store.select(getCurrentPath);
        this.showDetail$ = this.store.select(getShowDetail);
        this.currentFile$ = this.store.select(getCurrentFile);
        this.drawerMode = 'side';
    }
    getFolder(path: string) {
        this.store.dispatch(loadFolder({ path }));
    }
    getFolderByIndex(currentPath: string[], index: number) {
        let path = currentPath[0];
        for (let i = 1; i < index + 1; i++) {
            path = path + '/' + currentPath[i];
        }
        path = path + '/';
        this.store.dispatch(loadFolder({ path }));
    }

    getFile(item: FileItem) {
        this.store.dispatch(loadFile({ path: item.itemPath }));
        this.currentFileItem = item;
    }

}

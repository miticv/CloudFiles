import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { MatDrawer } from '@angular/material/sidenav';
import { MatDialog } from '@angular/material/dialog';
import { FileItem } from '../model/FileItem';
import { FileDetail } from '../model/FileDetail';
import { StorageContext } from '../service/file-manager.service';
import { loadFile, loadFolder, setContext } from '../store/file-manager.actions';
import { getCurrentPath, getFiles, getFolders, getCurrentFile, getShowDetail, getContext, getError } from '../store/file-manager.selectors';
import { StorageHelpDialogComponent } from '../../storage-browser/storage-help-dialog.component';

@Component({
    standalone: false,
    selector: 'app-file-manager-page',
    templateUrl: './file-manager-page.component.html',
    styleUrls: ['./file-manager-page.component.scss']
})
export class FileManagerPageComponent implements OnInit {
    @ViewChild('matDrawer', { static: true }) matDrawer: MatDrawer;
    drawerMode: 'side' | 'over' = 'side';

    files$: Observable<FileItem[]>;
    folders$: Observable<FileItem[]>;
    currentPath$: Observable<string[]>;
    currentFile$: Observable<FileDetail | null>;
    showDetail$: Observable<boolean>;
    context$: Observable<StorageContext>;
    error$: Observable<string | null>;
    currentFileItem: FileItem;

    constructor(
        private store: Store,
        private route: ActivatedRoute,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {
        const params = this.route.snapshot.queryParams;
        const provider = (params['provider'] as 'azure' | 'google') || 'azure';
        const context: StorageContext = {
            provider,
            account: params['account'],
            container: params['container']
        };
        this.store.dispatch(setContext({ context }));

        this.store.dispatch(loadFolder({ path: null }));
        this.files$ = this.store.select(getFiles);
        this.folders$ = this.store.select(getFolders);
        this.currentPath$ = this.store.select(getCurrentPath);
        this.showDetail$ = this.store.select(getShowDetail);
        this.currentFile$ = this.store.select(getCurrentFile);
        this.context$ = this.store.select(getContext);
        this.error$ = this.store.select(getError);
    }

    getFolder(path?: string) {
        this.store.dispatch(loadFolder({ path: path || null }));
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

    openHelp(): void {
        this.dialog.open(StorageHelpDialogComponent, { width: '560px' });
    }
}

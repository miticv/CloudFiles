import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
    storageBrowserPath: { label: string; level: string }[] = [];
    private currentContext: StorageContext;

    constructor(
        private store: Store,
        private route: ActivatedRoute,
        private router: Router,
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
        this.currentContext = context;
        this.store.dispatch(setContext({ context }));
        this.loadStorageBrowserPath(context);

        const savedPath = this.getSavedFolderPath(context);
        this.saveFileManagerState(savedPath);
        this.store.dispatch(loadFolder({ path: savedPath }));
        this.files$ = this.store.select(getFiles);
        this.folders$ = this.store.select(getFolders);
        this.currentPath$ = this.store.select(getCurrentPath);
        this.showDetail$ = this.store.select(getShowDetail);
        this.currentFile$ = this.store.select(getCurrentFile);
        this.context$ = this.store.select(getContext);
        this.error$ = this.store.select(getError);
    }

    getFolder(path?: string) {
        const folderPath = path || null;
        this.saveFileManagerState(folderPath);
        this.store.dispatch(loadFolder({ path: folderPath }));
    }

    getFolderByIndex(currentPath: string[], index: number) {
        let path = currentPath[0];
        for (let i = 1; i < index + 1; i++) {
            path = path + '/' + currentPath[i];
        }
        path = path + '/';
        this.saveFileManagerState(path);
        this.store.dispatch(loadFolder({ path }));
    }

    getFile(item: FileItem) {
        this.store.dispatch(loadFile({ path: item.itemPath }));
        this.currentFileItem = item;
    }

    navigateToStorageBrowser(level: string): void {
        if (level === 'root') {
            sessionStorage.removeItem('storageBrowserState');
        } else {
            const raw = sessionStorage.getItem('storageBrowserState');
            if (raw) {
                const state = JSON.parse(raw);
                delete state.selectedContainer;
                if (level === 'subscriptions') {
                    state.currentLevel = 'resourceGroups';
                } else if (level === 'resourceGroups') {
                    state.currentLevel = 'storageAccounts';
                } else {
                    state.currentLevel = 'containers';
                }
                sessionStorage.setItem('storageBrowserState', JSON.stringify(state));
            }
        }
        this.router.navigate(['/storage-browser']);
    }

    openHelp(): void {
        this.dialog.open(StorageHelpDialogComponent, { width: '560px' });
    }

    private saveFileManagerState(folderPath: string | null): void {
        sessionStorage.setItem('fileManagerState', JSON.stringify({
            provider: this.currentContext.provider,
            account: this.currentContext.account,
            container: this.currentContext.container,
            folderPath: folderPath
        }));
    }

    private getSavedFolderPath(context: StorageContext): string | null {
        const raw = sessionStorage.getItem('fileManagerState');
        if (!raw) return null;
        try {
            const state = JSON.parse(raw);
            if (state.provider === context.provider &&
                state.account === context.account &&
                state.container === context.container) {
                return state.folderPath || null;
            }
        } catch { /* ignore */ }
        return null;
    }

    private loadStorageBrowserPath(context: StorageContext): void {
        const raw = sessionStorage.getItem('storageBrowserState');
        if (!raw) return;
        try {
            const state = JSON.parse(raw);
            const path: { label: string; level: string }[] = [];
            if (state.selectedSubscription) {
                path.push({ label: state.selectedSubscription.displayName, level: 'subscriptions' });
            }
            if (state.selectedResourceGroup) {
                path.push({ label: state.selectedResourceGroup.name, level: 'resourceGroups' });
            }
            if (state.selectedStorageAccount) {
                path.push({ label: state.selectedStorageAccount.name, level: 'storageAccounts' });
            }
            if (context.container) {
                path.push({ label: context.container, level: 'containers' });
            }
            this.storageBrowserPath = path;
        } catch {
            // ignore malformed state
        }
    }
}

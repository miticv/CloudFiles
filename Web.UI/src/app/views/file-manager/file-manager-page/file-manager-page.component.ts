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
import { getCurrentPath, getFiles, getFolders, getCurrentFile, getShowDetail, getContext, getError, getIsLoading } from '../store/file-manager.selectors';
import { StorageHelpDialogComponent } from '../../storage-browser/storage-help-dialog.component';
import { MigrateDialogComponent, MigrateDialogData } from '../migrate-dialog/migrate-dialog.component';
import { CopyToGcsDialogComponent, CopyToGcsDialogData } from '../copy-to-gcs-dialog/copy-to-gcs-dialog.component';

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
    isLoading$: Observable<boolean>;
    currentFileItem: FileItem;
    storageBrowserPath: { label: string; level: string }[] = [];
    selectionMode = false;
    selectedFiles = new Set<FileItem>();
    selectedFolders = new Set<FileItem>();
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
        
        // Redirect to storage browser if account or container is missing
        if (!params['account'] || !params['container']) {
            this.router.navigate(['/storage-browser']);
            return;
        }
        
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
        this.isLoading$ = this.store.select(getIsLoading);
    }

    getFolder(path?: string) {
        this.clearSelection();
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

    toggleSelectionMode(): void {
        this.selectionMode = !this.selectionMode;
        if (!this.selectionMode) {
            this.clearSelection();
        }
    }

    toggleFileSelection(file: FileItem, event: Event): void {
        event.stopPropagation();
        if (this.selectedFiles.has(file)) {
            this.selectedFiles.delete(file);
        } else {
            this.selectedFiles.add(file);
        }
    }

    toggleFolderSelection(folder: FileItem, event: Event): void {
        event.stopPropagation();
        if (this.selectedFolders.has(folder)) {
            this.selectedFolders.delete(folder);
        } else {
            this.selectedFolders.add(folder);
        }
    }

    clearSelection(): void {
        this.selectedFiles.clear();
        this.selectedFolders.clear();
        this.selectionMode = false;
    }

    get hasSelection(): boolean {
        return this.selectedFiles.size > 0 || this.selectedFolders.size > 0;
    }

    openMigrateDialog(): void {
        const data: MigrateDialogData = {
            selectedFiles: Array.from(this.selectedFiles),
            selectedFolders: Array.from(this.selectedFolders),
            account: this.currentContext.account,
            container: this.currentContext.container
        };
        const dialogRef = this.dialog.open(MigrateDialogComponent, {
            width: '520px',
            data
        });
        dialogRef.afterClosed().subscribe(() => {
            this.clearSelection();
        });
    }

    openCopyToGcsDialog(): void {
        const data: CopyToGcsDialogData = {
            selectedFiles: Array.from(this.selectedFiles),
            selectedFolders: Array.from(this.selectedFolders),
            account: this.currentContext.account,
            container: this.currentContext.container
        };
        const dialogRef = this.dialog.open(CopyToGcsDialogComponent, {
            width: '520px',
            data
        });
        dialogRef.afterClosed().subscribe(() => {
            this.clearSelection();
        });
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

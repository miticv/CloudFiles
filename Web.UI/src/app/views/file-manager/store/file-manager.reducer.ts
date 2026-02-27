import { Action, createReducer, on } from '@ngrx/store';
import { FileDetail } from '../model/FileDetail';
import { FileItem } from '../model/FileItem';
import { StorageContext } from '../service/file-manager.service';
import { closeDetailDrawer, loadFileError, loadFileSuccess, loadFolderError, loadFolderSuccess, setContext } from './file-manager.actions';

export const storeFeatureKey = 'file-manager';

export interface FileManagerState {
    items: FileItem[] | null;
    currentPath: string[];
    currentFile: FileDetail | null;
    showDetail: boolean;
    context: StorageContext;
    error: string | null;
}

export const initialFilesState: FileManagerState = {
    items: null,
    currentPath: [],
    currentFile: null,
    showDetail: false,
    context: { provider: 'azure' },
    error: null
};

const filesReducer = createReducer(
    initialFilesState,

    on(setContext, (state, { context }) => ({
        ...state,
        context
    })),

    on(loadFolderSuccess, (state, { items, path }) => ({
        ...state,
        items,
        currentPath: path,
        showDetail: false,
        error: null
    })),

    on(loadFolderError, (state, { message }) => ({
        ...state,
        items: [],
        error: message
    })),

    on(loadFileSuccess, (state, { file }) => ({
        ...state,
        currentFile: file,
        showDetail: true,
        error: null
    })),

    on(loadFileError, (state, { message }) => ({
        ...state,
        error: message
    })),

    on(closeDetailDrawer, state => ({
        ...state,
        showDetail: false
    }))
);

export const reducer = (state: FileManagerState | undefined, action: Action) => filesReducer(state, action);

import { FileDetail } from './../model/FileDetail';

import {
    Action,
    ActionReducer,
    ActionReducerMap,
    createFeatureSelector,
    createReducer,
    createSelector,
    MetaReducer,
    on
} from '@ngrx/store';
import { FileItem } from '../model/FileItem';
import { closeDetailDrawer, loadFileSuccess, loadFolderSuccess } from './file-manager.actions';


export const storeFeatureKey = 'file-manager';

export interface FileManagerState {
    items: FileItem[];
    currentPath: string[];
    currentFile: FileDetail;
    showDetail: boolean;
}

export const initialFilesState: FileManagerState = {
    items: null,
    currentPath: [],
    currentFile: null,
    showDetail: false
};

const filesReducer = createReducer(
    initialFilesState,

    on(loadFolderSuccess, (state, { items, path }) => ({
        ...state,
        items,
        currentPath: path,
        showDetail: false
    })),

    on(loadFileSuccess, (state, { file }) => ({
        ...state,
        currentFile: file,
        showDetail: true
    })),
    on(closeDetailDrawer, state => ({
        ...state,
        showDetail: false
    }))
);


export const reducer = (state: FileManagerState, action: Action) => filesReducer(state, action);


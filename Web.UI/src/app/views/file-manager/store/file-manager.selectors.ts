import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FileManagerState, storeFeatureKey } from './file-manager.reducer';

export const getFileManagerState = createFeatureSelector<FileManagerState>(storeFeatureKey);

export const getCurrentPath = createSelector(
    getFileManagerState,
    (state: FileManagerState) => state.currentPath
);

export const getFiles = createSelector(
    getFileManagerState,
    (state: FileManagerState) => state.items?.filter(x => !x.isFolder) ?? []
);

export const getFolders = createSelector(
    getFileManagerState,
    (state: FileManagerState) => state.items?.filter(x => x.isFolder) ?? []
);

export const getCurrentFile = createSelector(
    getFileManagerState,
    (state: FileManagerState) => state.currentFile
);

export const getShowDetail = createSelector(
    getFileManagerState,
    (state: FileManagerState) => state.showDetail
);

export const getContext = createSelector(
    getFileManagerState,
    (state: FileManagerState) => state.context
);

export const getError = createSelector(
    getFileManagerState,
    (state: FileManagerState) => state.error
);

export const getIsLoading = createSelector(
    getFileManagerState,
    (state: FileManagerState) => state.items === null
);

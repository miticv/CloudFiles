import { FileItem } from './../model/FileItem';
import { createAction, props } from '@ngrx/store';
import { FileDetail } from '../model/FileDetail';

export const loadFolder = createAction(
    '[Files] Load Folder List',
    props<{ path: string | null }>()
);

export const loadFolderSuccess = createAction(
    '[Files] Load Folder Success',
    props<{ items: FileItem[]; path: string[] }>()
);

export const loadFile = createAction(
    '[Files] Load File List',
    props<{ path: string | null }>()
);

export const loadFileSuccess = createAction(
    '[Files] Load File Success',
    props<{ file: FileDetail }>()
);

export const closeDetailDrawer = createAction(
    '[Files] Close Detail Drawer'
);

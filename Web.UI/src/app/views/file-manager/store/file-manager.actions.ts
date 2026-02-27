import { createAction, props } from '@ngrx/store';
import { FileDetail } from '../model/FileDetail';
import { FileItem } from '../model/FileItem';
import { StorageContext } from '../service/file-manager.service';

export const setContext = createAction(
    '[Files] Set Storage Context',
    props<{ context: StorageContext }>()
);

export const loadFolder = createAction(
    '[Files] Load Folder List',
    props<{ path: string | null }>()
);

export const loadFolderSuccess = createAction(
    '[Files] Load Folder Success',
    props<{ items: FileItem[]; path: string[] }>()
);

export const loadFile = createAction(
    '[Files] Load File',
    props<{ path: string | null }>()
);

export const loadFileSuccess = createAction(
    '[Files] Load File Success',
    props<{ file: FileDetail }>()
);

export const loadFolderError = createAction(
    '[Files] Load Folder Error',
    props<{ message: string }>()
);

export const loadFileError = createAction(
    '[Files] Load File Error',
    props<{ message: string }>()
);

export const closeDetailDrawer = createAction(
    '[Files] Close Detail Drawer'
);

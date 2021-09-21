/* eslint-disable arrow-body-style */
import { map, switchMap } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { FileManagerService } from '../service/file-manager.service';
import * as FileManagerActions from './file-manager.actions';

@Injectable()
export class FileManagerEffects {

    loadFolder$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FileManagerActions.loadFolder),
            switchMap((action) => {
                return this.fileManagerService.getFolder(action.path).pipe(
                    map((items) => {
                        const path = action.path ? action.path.split('/').filter(x => x) : [];
                        return FileManagerActions.loadFolderSuccess({ items, path });
                    }));
            }))
    );


    loadFile$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FileManagerActions.loadFile),
            switchMap((action) => {
                return this.fileManagerService.getFile(action.path).pipe(
                    map((file) => {
                        return FileManagerActions.loadFileSuccess({ file });
                    }));
            }))
    );

    constructor(private actions$: Actions,
        private fileManagerService: FileManagerService,
        private router: Router) { }
}

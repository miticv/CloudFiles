import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { FileManagerService } from '../service/file-manager.service';
import * as FileManagerActions from './file-manager.actions';
import { getContext } from './file-manager.selectors';

@Injectable()
export class FileManagerEffects {

    loadFolder$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FileManagerActions.loadFolder),
            withLatestFrom(this.store.select(getContext)),
            switchMap(([action, context]) =>
                this.fileManagerService.getFolder(action.path, context).pipe(
                    map((items) => {
                        const path = action.path ? action.path.split('/').filter(x => x) : [];
                        return FileManagerActions.loadFolderSuccess({ items, path });
                    }),
                    catchError((error) => of(FileManagerActions.loadFolderError({
                        message: this.extractErrorMessage(error, 'Failed to load folder contents')
                    })))
                )
            )
        )
    );

    loadFile$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FileManagerActions.loadFile),
            withLatestFrom(this.store.select(getContext)),
            switchMap(([action, context]) =>
                this.fileManagerService.getFile(action.path, context).pipe(
                    map((file) => FileManagerActions.loadFileSuccess({ file })),
                    catchError((error) => of(FileManagerActions.loadFileError({
                        message: this.extractErrorMessage(error, 'Failed to load file')
                    })))
                )
            )
        )
    );

    private extractErrorMessage(error: unknown, fallback: string): string {
        if (error instanceof HttpErrorResponse) {
            // Backend returns { message: "..." } via FormatErrorMessage
            if (error.error?.message) {
                return error.error.message;
            }
            // Backend returns a plain string (e.g. BadRequestObjectResult("..."))
            if (typeof error.error === 'string' && error.error) {
                return error.error;
            }
            // No body — use status text
            if (error.status === 401) {
                return 'Authentication failed. Please sign in again.';
            }
            if (error.status === 403) {
                return 'Access denied. You may need the Storage Blob Data Reader role.';
            }
            if (error.status === 0) {
                return 'Could not reach the server. Is the backend running?';
            }
            return `${fallback} (HTTP ${error.status})`;
        }
        return fallback;
    }

    constructor(
        private actions$: Actions,
        private store: Store,
        private fileManagerService: FileManagerService
    ) {}
}

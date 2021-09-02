import { environment } from 'environments/environment';
import {
    ActionReducer,
    ActionReducerMap,
    createFeatureSelector,
    createSelector,
    MetaReducer
} from '@ngrx/store';


export const storeFeatureKey = 'files';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FilesState {

}

export const reducers: ActionReducerMap<FilesState> = {

};


export const metaReducers: MetaReducer<FilesState>[] = !environment.production ? [] : [];

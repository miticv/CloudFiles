import { environment } from 'environments/environment';
import {
    ActionReducer,
    ActionReducerMap,
    createFeatureSelector,
    createSelector,
    MetaReducer
} from '@ngrx/store';

import { routerReducer } from '@ngrx/router-store';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AppState {

};

export const reducers: ActionReducerMap<AppState> = {
    router: routerReducer,
};


export const metaReducers: MetaReducer<AppState>[] = !environment.production ? [] : [];

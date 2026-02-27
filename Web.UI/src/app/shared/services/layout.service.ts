import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface LayoutConf {
    navigationPos: 'side' | 'top';
    sidebarStyle: 'full' | 'compact' | 'closed';
    dir: 'ltr' | 'rtl';
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
    layoutConf: LayoutConf = {
        navigationPos: 'side',
        sidebarStyle: 'full',
        dir: 'ltr'
    };

    layoutConf$ = new BehaviorSubject<LayoutConf>(this.layoutConf);

    publishLayoutChange(changes: Partial<LayoutConf>) {
        this.layoutConf = { ...this.layoutConf, ...changes };
        this.layoutConf$.next(this.layoutConf);
    }
}

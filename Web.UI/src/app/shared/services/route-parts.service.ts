import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';

interface RoutePart {
    title: string;
    breadcrumb: string;
    params: any;
    url: string;
    urlFromRoot: string;
}

@Injectable({ providedIn: 'root' })
export class RoutePartsService {
    generateRouteParts(snapshot: ActivatedRouteSnapshot): RoutePart[] {
        let routeParts: RoutePart[] = [];
        if (snapshot) {
            if (snapshot.firstChild) {
                routeParts = routeParts.concat(this.generateRouteParts(snapshot.firstChild));
            }
            if (snapshot.data['title'] && snapshot.url.length) {
                routeParts.push({
                    title: snapshot.data['title'],
                    breadcrumb: snapshot.data['breadcrumb'] || '',
                    params: snapshot.params,
                    url: snapshot.url.map(s => s.toString()).join('/'),
                    urlFromRoot: snapshot.pathFromRoot.map(s => s.url.map(seg => seg.toString()).join('/')).join('/')
                });
            }
        }
        return routeParts;
    }
}

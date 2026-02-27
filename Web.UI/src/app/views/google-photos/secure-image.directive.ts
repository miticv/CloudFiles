import { Directive, ElementRef, Input, OnChanges, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Directive({
    standalone: false,
    selector: '[secureImage]'
})
export class SecureImageDirective implements OnChanges, OnDestroy {
    @Input() secureImage: string;
    private objectUrl: string | null = null;

    constructor(private el: ElementRef<HTMLImageElement>, private http: HttpClient) {}

    ngOnChanges(): void {
        if (!this.secureImage) return;
        this.cleanup();
        this.http.get(this.secureImage, { responseType: 'blob' }).subscribe({
            next: (blob) => {
                this.objectUrl = URL.createObjectURL(blob);
                this.el.nativeElement.src = this.objectUrl;
            }
        });
    }

    ngOnDestroy(): void {
        this.cleanup();
    }

    private cleanup(): void {
        if (this.objectUrl) {
            URL.revokeObjectURL(this.objectUrl);
            this.objectUrl = null;
        }
    }
}

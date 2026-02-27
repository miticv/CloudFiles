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

        const img = this.el.nativeElement;
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.3s ease';

        this.http.get(this.secureImage, { responseType: 'blob' }).subscribe({
            next: (blob) => {
                if (blob.size === 0) {
                    this.showBroken();
                    return;
                }
                this.objectUrl = URL.createObjectURL(blob);
                img.src = this.objectUrl;
                img.onload = () => { img.style.opacity = '1'; };
            },
            error: () => {
                this.showBroken();
            }
        });
    }

    ngOnDestroy(): void {
        this.cleanup();
    }

    private showBroken(): void {
        const img = this.el.nativeElement;
        const parent = img.parentElement;
        if (parent) {
            parent.style.display = 'flex';
            parent.style.alignItems = 'center';
            parent.style.justifyContent = 'center';

            // Only add the icon if not already present
            if (!parent.querySelector('.secure-img-fallback')) {
                const icon = document.createElement('span');
                icon.className = 'secure-img-fallback material-icons';
                icon.textContent = 'broken_image';
                icon.style.cssText = 'font-size:32px;color:rgba(0,0,0,0.25);';
                parent.appendChild(icon);
            }
        }
        img.style.display = 'none';
    }

    private cleanup(): void {
        if (this.objectUrl) {
            URL.revokeObjectURL(this.objectUrl);
            this.objectUrl = null;
        }
    }
}

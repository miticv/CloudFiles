import { trigger, transition, style, animate } from '@angular/animations';

export const appAnimations = [
    trigger('animate', [
        transition('void => *', [
            style({ opacity: 0, transform: 'translateY({{ y }})' }),
            animate('{{ duration }} {{ delay }} ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
        ], { params: { y: '20px', opacity: '0', delay: '0ms', duration: '300ms' } })
    ])
];

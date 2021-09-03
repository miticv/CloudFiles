
import { FuseNavigationItem } from '@fuse/components/navigation';
import { Navigation } from '../navigation/navigation.types';

const defaultNavigation: FuseNavigationItem[] = [
    {
        id: 'file-manager',
        title: 'File manager',
        type: 'basic',
        icon: 'file_copy',
        link: '/file-manager'
    },
    {
        id: 'example',
        title: 'Example',
        type: 'basic',
        icon: 'heroicons_outline:chart-pie',
        link: '/example'
    }
];

export const navigationConfig: Navigation = {
    default: defaultNavigation,
    compact: defaultNavigation,
    futuristic: defaultNavigation,
    horizontal: defaultNavigation
};




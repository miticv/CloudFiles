
import { FuseNavigationItem } from '@fuse/components/navigation';
import { Navigation } from '../navigation/navigation.types';

const defaultNavigation: FuseNavigationItem[] = [
    {
        id: 'files',
        title: 'Copy Files',
        type: 'basic',
        icon: 'file_copy',
        link: '/files'
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




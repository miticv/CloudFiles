import { create } from 'zustand';
import type { FileItem, FileDetail, StorageContext } from '@/api/types';

interface FileManagerState {
  context: StorageContext;
  currentPath: string[];
  items: FileItem[] | null;
  currentFile: FileDetail | null;
  showDetail: boolean;
  error: string | null;

  // Selection
  selectionMode: boolean;
  selectedFiles: Set<string>;
  selectedFolders: Set<string>;

  // Actions
  setContext: (ctx: StorageContext) => void;
  setItems: (items: FileItem[], pathStr: string | null) => void;
  setError: (message: string) => void;
  setCurrentFile: (file: FileDetail) => void;
  closeDetail: () => void;
  toggleSelectionMode: () => void;
  toggleFileSelection: (path: string) => void;
  toggleFolderSelection: (path: string) => void;
  clearSelection: () => void;
  selectAllFiles: (files: FileItem[]) => void;
}

export const useFileManagerStore = create<FileManagerState>((set) => ({
  context: { provider: 'azure' },
  currentPath: [],
  items: null,
  currentFile: null,
  showDetail: false,
  error: null,
  selectionMode: false,
  selectedFiles: new Set(),
  selectedFolders: new Set(),

  setContext: (ctx) => set({
    context: ctx,
    items: null,
    currentPath: [],
    currentFile: null,
    showDetail: false,
    error: null,
    selectedFiles: new Set(),
    selectedFolders: new Set(),
  }),

  setItems: (items, pathStr) => {
    const currentPath = pathStr ? pathStr.split('/').filter(Boolean) : [];
    set({ items, currentPath, error: null, showDetail: false });
  },

  setError: (message) => set({ error: message, items: [] }),

  setCurrentFile: (file) => set({ currentFile: file, showDetail: true, error: null }),

  closeDetail: () => set({ showDetail: false }),

  toggleSelectionMode: () => set((state) => ({
    selectionMode: !state.selectionMode,
    selectedFiles: new Set(),
    selectedFolders: new Set(),
  })),

  toggleFileSelection: (path) => set((state) => {
    const next = new Set(state.selectedFiles);
    if (next.has(path)) next.delete(path); else next.add(path);
    return { selectedFiles: next };
  }),

  toggleFolderSelection: (path) => set((state) => {
    const next = new Set(state.selectedFolders);
    if (next.has(path)) next.delete(path); else next.add(path);
    return { selectedFolders: next };
  }),

  clearSelection: () => set({ selectedFiles: new Set(), selectedFolders: new Set() }),

  selectAllFiles: (files) => set({
    selectedFiles: new Set(files.filter(f => !f.isFolder).map(f => f.itemPath)),
  }),
}));

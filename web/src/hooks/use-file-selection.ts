import { useState, useCallback } from 'react';

export function useFileSelection<T = string>() {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<T>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<T>>(new Set());

  const toggleItem = useCallback((id: T, set: React.Dispatch<React.SetStateAction<Set<T>>>) => {
    set((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const totalSelected = selectedFiles.size + selectedFolders.size;

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => !prev);
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  }, []);

  return {
    selectionMode,
    selectedFiles,
    selectedFolders,
    setSelectedFiles,
    setSelectedFolders,
    toggleItem,
    totalSelected,
    toggleSelectionMode,
    clearSelection,
  };
}

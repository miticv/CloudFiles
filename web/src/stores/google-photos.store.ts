import { create } from 'zustand';
import type { PickedMediaItem } from '@/api/types';

interface GooglePhotosState {
  savedItems: PickedMediaItem[];
  processedSessions: Set<string>;

  addItems: (items: PickedMediaItem[], sessionId: string) => void;
  clearAll: () => void;
}

export const useGooglePhotosStore = create<GooglePhotosState>((set, get) => ({
  savedItems: [],
  processedSessions: new Set(),

  addItems: (items, sessionId) => {
    if (get().processedSessions.has(sessionId)) return;
    set((state) => {
      const existingIds = new Set(state.savedItems.map((i) => i.id));
      const deduped = items.filter((i) => !existingIds.has(i.id));
      return {
        savedItems: deduped.length > 0 ? [...state.savedItems, ...deduped] : state.savedItems,
        processedSessions: new Set(state.processedSessions).add(sessionId),
      };
    });
  },

  clearAll: () => set({ savedItems: [], processedSessions: new Set() }),
}));

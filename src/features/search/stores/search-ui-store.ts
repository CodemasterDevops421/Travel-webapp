import { create } from 'zustand';

type SearchUIState = {
  activeMood: string | null;
  setActiveMood: (mood: string | null) => void;
};

export const useSearchUIStore = create<SearchUIState>((set) => ({
  activeMood: null,
  setActiveMood: (activeMood) => set({ activeMood })
}));

import { create } from 'zustand';

type SearchUIState = {
  activeMood: string | null;
  language: string;
  currency: string;
  setActiveMood: (mood: string | null) => void;
  setLanguage: (language: string) => void;
  setCurrency: (currency: string) => void;
};

export const useSearchUIStore = create<SearchUIState>((set) => ({
  activeMood: null,
  language: 'en',
  currency: 'USD',
  setActiveMood: (activeMood) => set({ activeMood: activeMood?.trim() || null }),
  setLanguage: (language) => set({ language }),
  setCurrency: (currency) => set({ currency })
}));

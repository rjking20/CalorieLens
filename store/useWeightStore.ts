import { create } from 'zustand';
import { WeightEntry } from '@/utils/types';
import {
  getWeightEntries as dbGetWeightEntries,
  getLatestWeight as dbGetLatestWeight,
  addWeightEntry as dbAddWeightEntry,
  deleteWeightEntry as dbDeleteWeightEntry,
} from '@/services/database';
import { getToday, generateId } from '@/utils/helpers';

export interface WeightState {
  entries: WeightEntry[];
  latestWeight: number | null;
  isLoading: boolean;

  // Actions
  loadEntries: () => Promise<void>;
  addWeight: (weight: number) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

export const useWeightStore = create<WeightState>((set, get) => ({
  entries: [],
  latestWeight: null,
  isLoading: false,

  loadEntries: async () => {
    set({ isLoading: true });
    try {
      const entries = await dbGetWeightEntries(30);
      const latest = await dbGetLatestWeight();
      set({
        entries,
        latestWeight: latest ? latest.weight : (entries.length > 0 ? entries[0].weight : null),
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load weight entries:', error);
      set({ isLoading: false });
    }
  },

  addWeight: async (weight: number) => {
    if (weight <= 0) return;
    set({ isLoading: true });
    try {
      const roundedWeight = Math.round(weight * 10) / 10;
      const entry: WeightEntry = {
        id: generateId(),
        weight: roundedWeight,
        date: getToday(),
        createdAt: new Date().toISOString(),
      };
      await dbAddWeightEntry(entry);
      await get().loadEntries();
    } catch (error) {
      console.error('Failed to add weight entry:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteEntry: async (id: string) => {
    set({ isLoading: true });
    try {
      await dbDeleteWeightEntry(id);
      await get().loadEntries();
    } catch (error) {
      console.error('Failed to delete weight entry:', error);
      set({ isLoading: false });
      throw error;
    }
  },
}));

import { create } from 'zustand';
import { WaterEntry } from '@/utils/types';
import {
  getWaterByDate as dbGetWaterByDate,
  addWaterEntry as dbAddWaterEntry,
  deleteWaterEntry as dbDeleteWaterEntry,
} from '@/services/database';
import { getToday, generateId } from '@/utils/helpers';

export interface WaterState {
  todayEntries: WaterEntry[];
  todayTotal: number;
  isLoading: boolean;

  // Actions
  loadToday: () => Promise<void>;
  addWater: (amount: number) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
}

export const useWaterStore = create<WaterState>((set, get) => ({
  todayEntries: [],
  todayTotal: 0,
  isLoading: false,

  loadToday: async () => {
    const today = getToday();
    set({ isLoading: true });
    try {
      const entries = await dbGetWaterByDate(today);
      const total = entries.reduce((sum, item) => sum + (item.amount || 0), 0);
      set({
        todayEntries: entries,
        todayTotal: Math.round(total),
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load today water entries:', error);
      set({ isLoading: false });
    }
  },

  addWater: async (amount: number) => {
    if (amount <= 0) return;
    set({ isLoading: true });
    try {
      const entry: WaterEntry = {
        id: generateId(),
        amount: Math.round(amount),
        date: getToday(),
        createdAt: new Date().toISOString(),
      };
      await dbAddWaterEntry(entry);
      await get().loadToday();
    } catch (error) {
      console.error('Failed to add water entry:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  removeEntry: async (id: string) => {
    set({ isLoading: true });
    try {
      await dbDeleteWaterEntry(id);
      await get().loadToday();
    } catch (error) {
      console.error('Failed to remove water entry:', error);
      set({ isLoading: false });
      throw error;
    }
  },
}));

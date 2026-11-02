import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '@/utils/types';

export interface ProfileState {
  profile: UserProfile | null;
  apiKey: string;
  isOnboarded: boolean;

  // Actions
  setProfile: (profile: UserProfile) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  setApiKey: (key: string) => void;
  setOnboarded: (value: boolean) => void;
  getCalorieGoal: () => number;
  getWaterGoal: () => number;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      apiKey: '',
      isOnboarded: false,

      setProfile: (profile: UserProfile) => {
        set({ profile });
      },

      updateProfile: (partial: Partial<UserProfile>) => {
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...partial } : (partial as UserProfile),
        }));
      },

      setApiKey: (apiKey: string) => {
        set({ apiKey });
      },

      setOnboarded: (isOnboarded: boolean) => {
        set({ isOnboarded });
      },

      getCalorieGoal: (): number => {
        const { profile } = get();
        return profile?.dailyCalorieGoal ?? 2000;
      },

      getWaterGoal: (): number => {
        const { profile } = get();
        return profile?.dailyWaterGoal ?? 2500;
      },
    }),
    {
      name: 'calorielens-profile-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

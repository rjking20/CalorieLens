import { create } from 'zustand';
import { MealEntry, DailySummary } from '@/utils/types';
import {
  addMeal as dbAddMeal,
  getMealsByDate as dbGetMealsByDate,
  getMealsInRange as dbGetMealsInRange,
  deleteMeal as dbDeleteMeal,
  updateMeal as dbUpdateMeal,
} from '@/services/database';
import { getToday, formatDateISO, generateId } from '@/utils/helpers';

export interface WeeklyDataPoint {
  date: string;
  day: string;
  calories: number;
}

export interface MealState {
  meals: MealEntry[];
  todayMeals: MealEntry[];
  weeklyData: WeeklyDataPoint[];
  isLoading: boolean;
  selectedDate: string;

  // Actions
  loadTodayMeals: () => Promise<void>;
  loadMealsByDate: (date: string) => Promise<void>;
  addMeal: (meal: Omit<MealEntry, 'id' | 'createdAt'>) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  updateMeal: (meal: MealEntry) => Promise<void>;
  getTodaySummary: () => DailySummary;
  getWeeklyData: () => Promise<WeeklyDataPoint[]>;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const useMealStore = create<MealState>((set, get) => ({
  meals: [],
  todayMeals: [],
  weeklyData: [],
  isLoading: false,
  selectedDate: getToday(),

  loadTodayMeals: async () => {
    const today = getToday();
    set({ isLoading: true });
    try {
      const todayMeals = await dbGetMealsByDate(today);
      set((state) => ({
        todayMeals,
        meals: state.selectedDate === today ? todayMeals : state.meals,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to load today meals:', error);
      set({ isLoading: false });
    }
  },

  loadMealsByDate: async (date: string) => {
    set({ isLoading: true, selectedDate: date });
    try {
      const meals = await dbGetMealsByDate(date);
      const today = getToday();
      set({
        meals,
        isLoading: false,
        ...(date === today ? { todayMeals: meals } : {}),
      });
    } catch (error) {
      console.error(`Failed to load meals for ${date}:`, error);
      set({ isLoading: false });
    }
  },

  addMeal: async (mealData: Omit<MealEntry, 'id' | 'createdAt'>) => {
    set({ isLoading: true });
    try {
      const newMeal: MealEntry = {
        ...mealData,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      await dbAddMeal(newMeal);

      const today = getToday();
      const currentSelectedDate = get().selectedDate;

      // Refresh today's meals
      const refreshedTodayMeals = await dbGetMealsByDate(today);

      let refreshedSelectedMeals = refreshedTodayMeals;
      if (currentSelectedDate !== today) {
        refreshedSelectedMeals = await dbGetMealsByDate(currentSelectedDate);
      }

      set({
        todayMeals: refreshedTodayMeals,
        meals: refreshedSelectedMeals,
        isLoading: false,
      });

      // Update weekly data in background
      get().getWeeklyData();
    } catch (error) {
      console.error('Failed to add meal:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteMeal: async (id: string) => {
    set({ isLoading: true });
    try {
      await dbDeleteMeal(id);

      const today = getToday();
      const currentSelectedDate = get().selectedDate;

      const refreshedTodayMeals = await dbGetMealsByDate(today);
      let refreshedSelectedMeals = refreshedTodayMeals;
      if (currentSelectedDate !== today) {
        refreshedSelectedMeals = await dbGetMealsByDate(currentSelectedDate);
      }

      set({
        todayMeals: refreshedTodayMeals,
        meals: refreshedSelectedMeals,
        isLoading: false,
      });

      // Update weekly data in background
      get().getWeeklyData();
    } catch (error) {
      console.error('Failed to delete meal:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateMeal: async (meal: MealEntry) => {
    set({ isLoading: true });
    try {
      await dbUpdateMeal(meal);

      const today = getToday();
      const currentSelectedDate = get().selectedDate;

      const refreshedTodayMeals = await dbGetMealsByDate(today);
      let refreshedSelectedMeals = refreshedTodayMeals;
      if (currentSelectedDate !== today) {
        refreshedSelectedMeals = await dbGetMealsByDate(currentSelectedDate);
      }

      set({
        todayMeals: refreshedTodayMeals,
        meals: refreshedSelectedMeals,
        isLoading: false,
      });

      // Update weekly data in background
      get().getWeeklyData();
    } catch (error) {
      console.error('Failed to update meal:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getTodaySummary: (): DailySummary => {
    const { todayMeals } = get();
    const today = getToday();

    const totalCalories = Math.round(
      todayMeals.reduce((acc, meal) => acc + (meal.calories || 0), 0)
    );
    const totalProtein =
      Math.round(todayMeals.reduce((acc, meal) => acc + (meal.protein || 0), 0) * 10) / 10;
    const totalCarbs =
      Math.round(todayMeals.reduce((acc, meal) => acc + (meal.carbs || 0), 0) * 10) / 10;
    const totalFat =
      Math.round(todayMeals.reduce((acc, meal) => acc + (meal.fat || 0), 0) * 10) / 10;

    return {
      date: today,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      totalWater: 0,
      meals: todayMeals,
    };
  },

  getWeeklyData: async (): Promise<WeeklyDataPoint[]> => {
    try {
      const days: WeeklyDataPoint[] = [];
      const now = new Date();

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = formatDateISO(d);
        const dayName = dayNames[d.getDay()];
        days.push({
          date: dateStr,
          day: dayName,
          calories: 0,
        });
      }

      const startDate = days[0].date;
      const endDate = days[days.length - 1].date;

      const rangeMeals = await dbGetMealsInRange(startDate, endDate);

      for (const meal of rangeMeals) {
        const mealDay = meal.date.substring(0, 10);
        const target = days.find((d) => d.date === mealDay);
        if (target) {
          target.calories += Math.round(meal.calories || 0);
        }
      }

      set({ weeklyData: days });
      return days;
    } catch (error) {
      console.error('Failed to get weekly data:', error);
      return get().weeklyData;
    }
  },
}));

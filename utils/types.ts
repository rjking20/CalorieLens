export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Gender = 'male' | 'female' | 'other';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface MealEntry {
  id: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
  imageUri?: string;
  date: string; // ISO date string (e.g. 'YYYY-MM-DD' or full ISO string)
  createdAt: string; // ISO timestamp
}

export interface WaterEntry {
  id: string;
  amount: number; // in ml
  date: string; // ISO date string (e.g. 'YYYY-MM-DD')
  createdAt: string; // ISO timestamp
}

export interface WeightEntry {
  id: string;
  weight: number; // in kg
  date: string; // ISO date string (e.g. 'YYYY-MM-DD')
  createdAt: string; // ISO timestamp
}

export interface UserProfile {
  name: string;
  age: number;
  height: number; // in cm
  weight: number; // in kg
  goalWeight: number; // in kg
  gender: Gender;
  activityLevel: ActivityLevel;
  dailyCalorieGoal: number;
  dailyWaterGoal: number; // in ml
  proteinGoal: number; // in grams
  carbsGoal: number; // in grams
  fatGoal: number; // in grams
}

export interface NutritionInfo {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  confidence: number;
}

export interface DailySummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalWater: number;
  meals: MealEntry[];
}

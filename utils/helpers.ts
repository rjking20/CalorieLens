import { Colors } from '@/constants/theme';
import { UserProfile, MealType } from './types';

/**
 * Format a Date object or date string into a friendly display string (e.g. 'Mon, Nov 2').
 */
export const formatDate = (date: Date | string): string => {
  let d: Date;
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      d = new Date(year, month - 1, day);
    } else {
      d = new Date(date);
    }
  } else {
    d = date;
  }

  if (isNaN(d.getTime())) {
    return '';
  }

  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format a Date object into an ISO date string 'YYYY-MM-DD'.
 */
export const formatDateISO = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get today's date formatted as 'YYYY-MM-DD'.
 */
export const getToday = (): string => {
  return formatDateISO(new Date());
};

/**
 * Calculate Body Mass Index (BMI).
 * @param weight Weight in kg
 * @param height Height in cm
 * @returns BMI rounded to one decimal place
 */
export const calculateBMI = (weight: number, height: number): number => {
  if (weight <= 0 || height <= 0) {
    return 0;
  }
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  return Math.round(bmi * 10) / 10;
};

/**
 * Calculate Total Daily Energy Expenditure (TDEE) using the Mifflin-St Jeor equation.
 * @param profile UserProfile
 * @returns Estimated daily maintenance calories
 */
export const calculateTDEE = (profile: UserProfile): number => {
  const { weight, height, age, gender, activityLevel } = profile;

  if (weight <= 0 || height <= 0 || age <= 0) {
    return 2000;
  }

  // Base BMR via Mifflin-St Jeor
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else if (gender === 'female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    // Neutral average
    bmr = 10 * weight + 6.25 * height - 5 * age - 78;
  }

  // Activity multipliers
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const multiplier = activityMultipliers[activityLevel] ?? 1.2;
  return Math.round(bmr * multiplier);
};

/**
 * Generate a unique identifier string.
 */
export const generateId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Get an Ionicons icon name for a given meal type.
 */
export const getMealTypeIcon = (type: string): string => {
  const normalized = type?.toLowerCase() as MealType;
  switch (normalized) {
    case 'breakfast':
      return 'sunny-outline';
    case 'lunch':
      return 'restaurant-outline';
    case 'dinner':
      return 'moon-outline';
    case 'snack':
      return 'nutrition-outline';
    default:
      return 'restaurant-outline';
  }
};

/**
 * Get a theme color associated with a given meal type.
 */
export const getMealTypeColor = (type: string): string => {
  const normalized = type?.toLowerCase() as MealType;
  switch (normalized) {
    case 'breakfast':
      return Colors.accent; // #FF9800
    case 'lunch':
      return Colors.primary; // #4CAF50
    case 'dinner':
      return '#5C6BC0'; // Indigo
    case 'snack':
      return '#26A69A'; // Teal
    default:
      return Colors.primary;
  }
};

/**
 * Clamp a numerical value between a minimum and maximum boundary.
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

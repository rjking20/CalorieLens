import * as SQLite from 'expo-sqlite';
import { MealEntry, WaterEntry, WeightEntry } from '@/utils/types';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

/**
 * Get or open the SQLite database instance synchronously.
 */
export const getDb = (): SQLite.SQLiteDatabase => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('calorielens.db');
  }
  return dbInstance;
};

/**
 * Initialize database tables and indexes if they do not exist.
 */
export const initDatabase = async (): Promise<void> => {
  const db = getDb();
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY NOT NULL,
      foodName TEXT NOT NULL,
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      mealType TEXT NOT NULL,
      imageUri TEXT,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS water_entries (
      id TEXT PRIMARY KEY NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weight_entries (
      id TEXT PRIMARY KEY NOT NULL,
      weight REAL NOT NULL,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
    CREATE INDEX IF NOT EXISTS idx_water_date ON water_entries(date);
    CREATE INDEX IF NOT EXISTS idx_weight_date ON weight_entries(date);
  `);
  isInitialized = true;
};

/**
 * Helper to ensure the database schema is created before operations.
 */
const ensureInitialized = async (): Promise<void> => {
  if (!isInitialized) {
    await initDatabase();
  }
};

/**
 * Add a new meal entry or replace if existing.
 */
export const addMeal = async (meal: MealEntry): Promise<void> => {
  await ensureInitialized();
  const db = getDb();
  db.runSync(
    `INSERT OR REPLACE INTO meals (id, foodName, calories, protein, carbs, fat, mealType, imageUri, date, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      meal.id,
      meal.foodName,
      meal.calories,
      meal.protein,
      meal.carbs,
      meal.fat,
      meal.mealType,
      meal.imageUri ?? null,
      meal.date,
      meal.createdAt,
    ]
  );
};

/**
 * Get all meals for a given date (matching either exact date or date prefix).
 */
export const getMealsByDate = async (date: string): Promise<MealEntry[]> => {
  await ensureInitialized();
  const db = getDb();
  const rows = db.getAllSync<MealEntry>(
    `SELECT * FROM meals WHERE date = ? OR date LIKE ? || '%' ORDER BY createdAt ASC`,
    [date, date]
  );
  return rows.map((row) => ({
    ...row,
    imageUri: row.imageUri || undefined,
  }));
};

/**
 * Get all meals within a date range (inclusive).
 */
export const getMealsInRange = async (startDate: string, endDate: string): Promise<MealEntry[]> => {
  await ensureInitialized();
  const db = getDb();
  const startDay = startDate.substring(0, 10);
  const endDay = endDate.substring(0, 10);
  const rows = db.getAllSync<MealEntry>(
    `SELECT * FROM meals 
     WHERE substr(date, 1, 10) >= ? AND substr(date, 1, 10) <= ? 
     ORDER BY date ASC, createdAt ASC`,
    [startDay, endDay]
  );
  return rows.map((row) => ({
    ...row,
    imageUri: row.imageUri || undefined,
  }));
};

/**
 * Delete a meal by its unique ID.
 */
export const deleteMeal = async (id: string): Promise<void> => {
  await ensureInitialized();
  const db = getDb();
  db.runSync(`DELETE FROM meals WHERE id = ?`, [id]);
};

/**
 * Update an existing meal entry.
 */
export const updateMeal = async (meal: MealEntry): Promise<void> => {
  await ensureInitialized();
  const db = getDb();
  db.runSync(
    `UPDATE meals 
     SET foodName = ?, calories = ?, protein = ?, carbs = ?, fat = ?, mealType = ?, imageUri = ?, date = ?, createdAt = ? 
     WHERE id = ?`,
    [
      meal.foodName,
      meal.calories,
      meal.protein,
      meal.carbs,
      meal.fat,
      meal.mealType,
      meal.imageUri ?? null,
      meal.date,
      meal.createdAt,
      meal.id,
    ]
  );
};

/**
 * Add a water consumption entry.
 */
export const addWaterEntry = async (entry: WaterEntry): Promise<void> => {
  await ensureInitialized();
  const db = getDb();
  db.runSync(
    `INSERT OR REPLACE INTO water_entries (id, amount, date, createdAt)
     VALUES (?, ?, ?, ?)`,
    [entry.id, entry.amount, entry.date, entry.createdAt]
  );
};

/**
 * Get all water entries for a specific date.
 */
export const getWaterByDate = async (date: string): Promise<WaterEntry[]> => {
  await ensureInitialized();
  const db = getDb();
  return db.getAllSync<WaterEntry>(
    `SELECT * FROM water_entries WHERE date = ? OR date LIKE ? || '%' ORDER BY createdAt ASC`,
    [date, date]
  );
};

/**
 * Delete a water entry by ID.
 */
export const deleteWaterEntry = async (id: string): Promise<void> => {
  await ensureInitialized();
  const db = getDb();
  db.runSync(`DELETE FROM water_entries WHERE id = ?`, [id]);
};

/**
 * Add a weight tracking entry.
 */
export const addWeightEntry = async (entry: WeightEntry): Promise<void> => {
  await ensureInitialized();
  const db = getDb();
  db.runSync(
    `INSERT OR REPLACE INTO weight_entries (id, weight, date, createdAt)
     VALUES (?, ?, ?, ?)`,
    [entry.id, entry.weight, entry.date, entry.createdAt]
  );
};

/**
 * Get recent weight entries sorted from newest to oldest.
 */
export const getWeightEntries = async (limit: number = 30): Promise<WeightEntry[]> => {
  await ensureInitialized();
  const db = getDb();
  return db.getAllSync<WeightEntry>(
    `SELECT * FROM weight_entries ORDER BY date DESC, createdAt DESC LIMIT ?`,
    [limit]
  );
};

/**
 * Get the most recent weight entry recorded.
 */
export const getLatestWeight = async (): Promise<WeightEntry | null> => {
  await ensureInitialized();
  const db = getDb();
  const result = db.getFirstSync<WeightEntry>(
    `SELECT * FROM weight_entries ORDER BY date DESC, createdAt DESC LIMIT 1`
  );
  return result ?? null;
};

/**
 * Delete a weight entry by ID.
 */
export const deleteWeightEntry = async (id: string): Promise<void> => {
  await ensureInitialized();
  const db = getDb();
  db.runSync(`DELETE FROM weight_entries WHERE id = ?`, [id]);
};

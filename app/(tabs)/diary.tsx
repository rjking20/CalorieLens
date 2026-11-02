import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useMealStore } from '@/store/useMealStore';
import { useProfileStore } from '@/store/useProfileStore';
import { DateSelector } from '@/components/DateSelector';
import { MealCard } from '@/components/MealCard';
import { QuickAddButton } from '@/components/QuickAddButton';
import { MacroBar } from '@/components/MacroBar';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';
import { getToday, formatDate } from '@/utils/helpers';
import { MealEntry, MealType } from '@/utils/types';

interface MealGroupConfig {
  key: MealType;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const MEAL_GROUPS: MealGroupConfig[] = [
  {
    key: 'breakfast',
    title: 'Breakfast',
    icon: 'sunny',
    color: '#F57C00',
    bgColor: '#FFF3E0',
  },
  {
    key: 'lunch',
    title: 'Lunch',
    icon: 'restaurant',
    color: '#388E3C',
    bgColor: '#E8F5E9',
  },
  {
    key: 'dinner',
    title: 'Dinner',
    icon: 'moon',
    color: '#5C6BC0',
    bgColor: '#EDE7F6',
  },
  {
    key: 'snack',
    title: 'Snacks',
    icon: 'cafe',
    color: '#E65100',
    bgColor: '#FBE9E7',
  },
];

export default function DiaryScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getToday());

  const profile = useProfileStore((state) => state.profile);
  const { meals, loadMealsByDate, deleteMeal } = useMealStore();

  const calorieGoal = profile?.dailyCalorieGoal || 2000;

  // Load meals on focus or when date changes
  const fetchMeals = useCallback(
    async (date: string) => {
      try {
        await loadMealsByDate(date);
      } catch (error) {
        console.error('Failed to load meals for date:', date, error);
      }
    },
    [loadMealsByDate]
  );

  useFocusEffect(
    useCallback(() => {
      fetchMeals(selectedDate);
    }, [fetchMeals, selectedDate])
  );

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    fetchMeals(date);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMeals(selectedDate);
    setRefreshing(false);
  };

  // Nutrition aggregations for current selected day
  const dailyTotals = useMemo(() => {
    const totalCalories = Math.round(
      meals.reduce((sum, m) => sum + (m.calories || 0), 0)
    );
    const totalProtein =
      Math.round(meals.reduce((sum, m) => sum + (m.protein || 0), 0) * 10) / 10;
    const totalCarbs =
      Math.round(meals.reduce((sum, m) => sum + (m.carbs || 0), 0) * 10) / 10;
    const totalFat =
      Math.round(meals.reduce((sum, m) => sum + (m.fat || 0), 0) * 10) / 10;

    return { totalCalories, totalProtein, totalCarbs, totalFat };
  }, [meals]);

  // Group meals by mealType
  const groupedMeals = useMemo(() => {
    const map: Record<MealType, MealEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };

    meals.forEach((meal) => {
      const type = (meal.mealType || 'snack') as MealType;
      if (map[type]) {
        map[type].push(meal);
      } else {
        map.snack.push(meal);
      }
    });

    return map;
  }, [meals]);

  const remainingCalories = Math.max(0, calorieGoal - dailyTotals.totalCalories);
  const isOverGoal = dailyTotals.totalCalories > calorieGoal;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.screenTitle}>Food Diary</Text>
          <Text style={styles.screenSubtitle}>{formatDate(selectedDate)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDateChange(getToday())}
          style={styles.todayButton}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* Date Selector Bar */}
      <DateSelector
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Daily Summary Overview Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryTitle}>Daily Calorie Intake</Text>
              <Text style={styles.summarySub}>
                Goal: {calorieGoal.toLocaleString()} kcal
              </Text>
            </View>
            <View style={styles.caloriesBadge}>
              <Text style={styles.caloriesNumber}>
                {dailyTotals.totalCalories.toLocaleString()}
              </Text>
              <Text style={styles.caloriesUnit}>kcal</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(
                      (dailyTotals.totalCalories / (calorieGoal || 1)) * 100,
                      100
                    )}%`,
                    backgroundColor: isOverGoal ? Colors.danger : Colors.primary,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.remainingText,
                { color: isOverGoal ? Colors.danger : Colors.textSecondary },
              ]}
            >
              {isOverGoal
                ? `+${(dailyTotals.totalCalories - calorieGoal).toLocaleString()} kcal over goal`
                : `${remainingCalories.toLocaleString()} kcal remaining`}
            </Text>
          </View>

          {/* Macro Breakdown */}
          <View style={styles.macroRowWrapper}>
            <MacroBar
              protein={dailyTotals.totalProtein}
              carbs={dailyTotals.totalCarbs}
              fat={dailyTotals.totalFat}
              showLabels={true}
              showPercentages={true}
              height={8}
            />
          </View>
        </View>

        {/* Meal Groups */}
        {meals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="book-outline" size={42} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No meals logged for this day</Text>
            <Text style={styles.emptySubtitle}>
              Tap the scan button or + FAB to capture your meal and calculate its nutritional content instantly!
            </Text>
            <TouchableOpacity
              style={styles.emptyActionButton}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/camera')}
            >
              <Ionicons name="camera" size={18} color="#FFFFFF" />
              <Text style={styles.emptyActionText}>Scan a Meal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          MEAL_GROUPS.map((group) => {
            const groupEntries = groupedMeals[group.key];
            const groupCalories = Math.round(
              groupEntries.reduce((sum, item) => sum + (item.calories || 0), 0)
            );

            return (
              <View key={group.key} style={styles.groupSection}>
                {/* Group Header */}
                <View style={styles.groupHeaderRow}>
                  <View style={styles.groupHeaderLeft}>
                    <View
                      style={[
                        styles.groupIconCircle,
                        { backgroundColor: group.bgColor },
                      ]}
                    >
                      <Ionicons
                        name={group.icon}
                        size={18}
                        color={group.color}
                      />
                    </View>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>{groupEntries.length}</Text>
                    </View>
                  </View>

                  <Text style={styles.groupCaloriesText}>
                    {groupCalories} kcal
                  </Text>
                </View>

                {/* Group Meal Items */}
                {groupEntries.length === 0 ? (
                  <View style={styles.groupEmptyCard}>
                    <Text style={styles.groupEmptyText}>
                      No {group.title.toLowerCase()} logged
                    </Text>
                  </View>
                ) : (
                  groupEntries.map((meal) => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      onDelete={deleteMeal}
                      onPress={() => router.push(`/meal-detail?id=${meal.id}`)}
                    />
                  ))
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <QuickAddButton
        onPress={() => router.push('/(tabs)/camera')}
        icon="add"
        accessibilityLabel="Add new meal"
        bottom={24}
        right={20}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  screenTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  todayButtonText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xl + 40,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.xs,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  summarySub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  caloriesBadge: {
    alignItems: 'flex-end',
  },
  caloriesNumber: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primaryDark,
    lineHeight: 24,
  },
  caloriesUnit: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  progressContainer: {
    marginTop: Spacing.sm,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  remainingText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'right',
  },
  macroRowWrapper: {
    marginTop: Spacing.xs,
  },
  groupSection: {
    marginTop: Spacing.md,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  groupTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginRight: 6,
  },
  countBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countText: {
    fontSize: FontSize.xs - 2,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  groupCaloriesText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  groupEmptyCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderStyle: 'dashed',
    marginHorizontal: Spacing.sm,
    marginVertical: 4,
  },
  groupEmptyText: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    fontWeight: '500',
  },
  emptyContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
    gap: 8,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});

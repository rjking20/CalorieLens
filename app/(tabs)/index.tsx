import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';

import { useProfileStore } from '@/store/useProfileStore';
import { useMealStore } from '@/store/useMealStore';
import { useWaterStore } from '@/store/useWaterStore';
import { CalorieRing } from '@/components/CalorieRing';
import { MacroBar } from '@/components/MacroBar';
import { StatCard } from '@/components/StatCard';
import { MealCard } from '@/components/MealCard';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';
import { formatDate } from '@/utils/helpers';

const screenWidth = Dimensions.get('window').width;

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export default function DashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Store data
  const profile = useProfileStore((state) => state.profile);
  const {
    todayMeals,
    weeklyData,
    loadTodayMeals,
    getWeeklyData,
    getTodaySummary,
    deleteMeal,
  } = useMealStore();
  const { todayTotal: todayWaterTotal, loadToday: loadWaterToday } = useWaterStore();

  const summary = getTodaySummary();
  const calorieGoal = profile?.dailyCalorieGoal || 2000;
  const waterGoal = profile?.dailyWaterGoal || 2500;
  const proteinGoal = profile?.proteinGoal || 150;
  const carbsGoal = profile?.carbsGoal || 200;
  const fatGoal = profile?.fatGoal || 65;

  // Fetch or refresh dashboard data
  const fetchData = useCallback(async () => {
    try {
      await Promise.all([loadTodayMeals(), loadWaterToday(), getWeeklyData()]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }, [loadTodayMeals, loadWaterToday, getWeeklyData]);

  // Reload data every time dashboard tab is focused
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Recent meals: take last 4 meals in reverse chronological order
  const recentMeals = [...todayMeals]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  // Chart data formatting
  const chartLabels =
    weeklyData.length > 0
      ? weeklyData.map((d) => d.day)
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const chartDataPoints =
    weeklyData.length > 0
      ? weeklyData.map((d) => Math.max(0, Math.round(d.calories || 0)))
      : [0, 0, 0, 0, 0, 0, 0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
        {/* Header Greeting */}
        <View style={styles.headerSection}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greetingText}>
              {getGreeting()}, {profile?.name || 'Friend'} 👋
            </Text>
            <Text style={styles.dateText}>{formatDate(new Date())}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileAvatarButton}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle" size={42} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Calorie Ring Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionTitle}>Daily Calories</Text>
            <Text style={styles.cardSectionSubtitle}>
              {Math.max(0, calorieGoal - summary.totalCalories)} kcal remaining
            </Text>
          </View>

          <View style={styles.ringWrapper}>
            <CalorieRing
              consumed={summary.totalCalories}
              goal={calorieGoal}
              size={190}
              strokeWidth={16}
            />
          </View>

          {/* Macro Breakdown */}
          <View style={styles.macroContainer}>
            <View style={styles.macroHeader}>
              <Text style={styles.subHeading}>Macro Distribution</Text>
            </View>
            <MacroBar
              protein={summary.totalProtein}
              carbs={summary.totalCarbs}
              fat={summary.totalFat}
              showLabels={true}
              showPercentages={true}
              height={10}
            />
          </View>
        </View>

        {/* 2x2 Grid of Stat Cards */}
        <View style={styles.statCardsSection}>
          <Text style={styles.sectionHeaderTitle}>Today's Targets</Text>
          <View style={styles.statGrid}>
            <View style={styles.statGridRow}>
              <StatCard
                title="Protein"
                value={`${Math.round(summary.totalProtein)}`}
                unit={`/ ${proteinGoal}g`}
                icon="barbell"
                color={Colors.protein}
                subtitle={`${Math.round((summary.totalProtein / (proteinGoal || 1)) * 100)}% of goal`}
              />
              <View style={styles.statSpacer} />
              <StatCard
                title="Carbs"
                value={`${Math.round(summary.totalCarbs)}`}
                unit={`/ ${carbsGoal}g`}
                icon="leaf"
                color={Colors.carbs}
                subtitle={`${Math.round((summary.totalCarbs / (carbsGoal || 1)) * 100)}% of goal`}
              />
            </View>

            <View style={[styles.statGridRow, { marginTop: Spacing.sm }]}>
              <StatCard
                title="Fat"
                value={`${Math.round(summary.totalFat)}`}
                unit={`/ ${fatGoal}g`}
                icon="pizza"
                color="#F57F17"
                subtitle={`${Math.round((summary.totalFat / (fatGoal || 1)) * 100)}% of goal`}
              />
              <View style={styles.statSpacer} />
              <StatCard
                title="Water"
                value={`${todayWaterTotal}`}
                unit={`/ ${waterGoal}ml`}
                icon="water"
                color={Colors.water}
                subtitle={`${Math.round((todayWaterTotal / (waterGoal || 1)) * 100)}% of goal`}
                onPress={() => router.push('/(tabs)/water')}
              />
            </View>
          </View>
        </View>

        {/* Weekly Calorie Bar Chart */}
        <View style={styles.card}>
          <View style={styles.chartHeaderRow}>
            <View>
              <Text style={styles.cardSectionTitle}>Weekly Overview</Text>
              <Text style={styles.cardSectionSubtitle}>Last 7 Days Calories</Text>
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Calories</Text>
            </View>
          </View>

          <View style={styles.chartWrapper}>
            <BarChart
              data={{
                labels: chartLabels,
                datasets: [
                  {
                    data: chartDataPoints,
                  },
                ],
              }}
              width={screenWidth - Spacing.md * 2 - 32}
              height={200}
              yAxisLabel=""
              yAxisSuffix=""
              fromZero
              chartConfig={{
                backgroundColor: '#FFFFFF',
                backgroundGradientFrom: '#FFFFFF',
                backgroundGradientTo: '#FFFFFF',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                labelColor: () => Colors.textSecondary,
                fillShadowGradientFrom: Colors.primary,
                fillShadowGradientTo: Colors.primaryLight,
                fillShadowGradientFromOpacity: 1,
                fillShadowGradientToOpacity: 0.8,
                barPercentage: 0.65,
                propsForBackgroundLines: {
                  stroke: '#F0F0F0',
                  strokeDasharray: '4',
                },
              }}
              style={styles.chartStyle}
              showValuesOnTopOfBars={false}
            />
          </View>
        </View>

        {/* Recent Meals Section */}
        <View style={styles.recentMealsSection}>
          <View style={styles.recentHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>Recent Meals</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/diary')}
              activeOpacity={0.7}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.primary}
              />
            </TouchableOpacity>
          </View>

          {recentMeals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name="restaurant-outline"
                  size={36}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>No meals logged yet today</Text>
              <Text style={styles.emptySubtitle}>
                Snap a photo with CalorieLens or log from the diary to track your nutrition!
              </Text>
              <TouchableOpacity
                style={styles.logNowButton}
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/camera')}
              >
                <Ionicons name="camera" size={18} color="#FFFFFF" />
                <Text style={styles.logNowText}>Scan Food Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentMeals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                onDelete={deleteMeal}
                onPress={() => router.push(`/meal-detail?id=${meal.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl + 20,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  headerTextContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  profileAvatarButton: {
    padding: 2,
    marginLeft: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  cardSectionSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xs,
  },
  macroContainer: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingTop: Spacing.sm,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  subHeading: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statCardsSection: {
    marginBottom: Spacing.md,
  },
  sectionHeaderTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs + 2,
    letterSpacing: -0.2,
  },
  statGrid: {
    marginTop: 2,
  },
  statGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statSpacer: {
    width: Spacing.sm,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 4,
  },
  legendText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  chartStyle: {
    borderRadius: BorderRadius.md,
    marginVertical: 4,
  },
  recentMealsSection: {
    marginTop: Spacing.xs,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  seeAllText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '700',
    marginRight: 2,
  },
  emptyContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginVertical: Spacing.xs,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  logNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
    gap: 6,
  },
  logNowText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});

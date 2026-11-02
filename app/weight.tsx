import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';
import { WeightEntry } from '@/utils/types';
import { formatDate, getToday, calculateBMI, clamp } from '@/utils/helpers';
import { useWeightStore } from '@/store/useWeightStore';
import { useProfileStore } from '@/store/useProfileStore';

const screenWidth = Dimensions.get('window').width;

export default function WeightTrackerScreen() {
  const router = useRouter();

  const { entries, latestWeight, isLoading, loadEntries, addWeight, deleteEntry } =
    useWeightStore();
  const { profile, updateProfile } = useProfileStore();

  const [inputWeight, setInputWeight] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load entries on mount
  useEffect(() => {
    loadEntries();
  }, []);

  // Determine current weight
  const currentWeight = useMemo(() => {
    if (latestWeight !== null && latestWeight > 0) return latestWeight;
    if (entries.length > 0 && entries[0].weight > 0) return entries[0].weight;
    if (profile?.weight && profile.weight > 0) return profile.weight;
    return 70;
  }, [latestWeight, entries, profile]);

  // Set default input weight to current weight if input is empty
  useEffect(() => {
    if (!inputWeight && currentWeight) {
      setInputWeight(String(currentWeight));
    }
  }, [currentWeight]);

  // Starting weight (oldest entry in records, or profile weight)
  const startingWeight = useMemo(() => {
    if (entries.length > 0) {
      return entries[entries.length - 1].weight;
    }
    return profile?.weight ?? currentWeight;
  }, [entries, profile, currentWeight]);

  const goalWeight = profile?.goalWeight ?? currentWeight;
  const userHeight = profile?.height ?? 175;

  // BMI and Category
  const bmi = useMemo(() => {
    return calculateBMI(currentWeight, userHeight);
  }, [currentWeight, userHeight]);

  const bmiCategory = useMemo(() => {
    if (bmi < 18.5) {
      return { label: 'Underweight', color: '#2196F3' };
    } else if (bmi < 25) {
      return { label: 'Normal Weight', color: Colors.primary };
    } else if (bmi < 30) {
      return { label: 'Overweight', color: Colors.accent };
    } else {
      return { label: 'Obese', color: Colors.danger };
    }
  }, [bmi]);

  // Progress metrics
  const totalChange = Math.round((currentWeight - startingWeight) * 10) / 10;
  const remainingToGoal = Math.round((currentWeight - goalWeight) * 10) / 10;

  // Chronological entries for line chart (oldest to newest, last 30 entries)
  const chartData = useMemo(() => {
    if (entries.length === 0) return null;

    // Filter/slice to last 30 entries and reverse to chronological order
    const chronEntries = [...entries].reverse();

    // LineChart needs at least 2 points to draw correctly without crashing
    let dataPoints: number[] = [];
    let labels: string[] = [];

    if (chronEntries.length === 1) {
      const single = chronEntries[0];
      dataPoints = [single.weight, single.weight];
      labels = ['Start', formatDate(single.date)];
    } else {
      dataPoints = chronEntries.map((e) => e.weight);
      // Sample labels so they don't crowd the chart
      const totalPoints = chronEntries.length;
      labels = chronEntries.map((e, index) => {
        if (
          index === 0 ||
          index === totalPoints - 1 ||
          (totalPoints > 4 && index === Math.floor(totalPoints / 2))
        ) {
          try {
            const parts = e.date.split('-');
            if (parts.length === 3) {
              return `${parts[1]}/${parts[2]}`;
            }
            return formatDate(e.date).split(',')[0];
          } catch {
            return '';
          }
        }
        return '';
      });
    }

    const datasets: any[] = [
      {
        data: dataPoints,
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        strokeWidth: 3,
      },
    ];

    // Add Goal reference line dataset if goal is set
    if (goalWeight && goalWeight > 0) {
      datasets.push({
        data: dataPoints.map(() => goalWeight),
        color: (opacity = 1) => `rgba(255, 152, 0, ${opacity * 0.8})`,
        strokeWidth: 2,
        withDots: false,
      });
    }

    return {
      labels,
      datasets,
      legend: goalWeight > 0 ? ['Weight', 'Goal'] : ['Weight'],
    };
  }, [entries, goalWeight]);

  // Add new weight log
  const handleAddWeight = async () => {
    const val = parseFloat(inputWeight);
    if (isNaN(val) || val < 20 || val > 350) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight between 20 kg and 350 kg.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addWeight(val);
      // Keep user profile in sync
      updateProfile({ weight: val });
      Alert.alert('Logged!', `Weight recorded: ${val} kg`);
    } catch (err) {
      console.error('Failed to add weight entry:', err);
      Alert.alert('Error', 'Failed to log weight entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete weight log
  const handleDeleteEntry = (entry: WeightEntry) => {
    Alert.alert(
      'Delete Entry',
      `Delete record of ${entry.weight} kg on ${formatDate(entry.date)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(entry.id);
            } catch (err) {
              console.error('Failed to delete weight entry:', err);
              Alert.alert('Error', 'Could not delete entry.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Weight Tracker</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Current Weight & BMI Card */}
          <View style={styles.heroCard}>
            <LinearGradient
              colors={['#E8F5E9', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.heroLabel}>CURRENT WEIGHT</Text>
                  <View style={styles.weightNumberRow}>
                    <Text style={styles.heroWeightValue}>{currentWeight}</Text>
                    <Text style={styles.heroWeightUnit}>kg</Text>
                  </View>
                </View>

                {/* BMI Badge */}
                <View style={styles.bmiContainer}>
                  <Text style={styles.bmiValueText}>BMI {bmi}</Text>
                  <View
                    style={[
                      styles.bmiCategoryBadge,
                      { backgroundColor: `${bmiCategory.color}18` },
                    ]}
                  >
                    <View
                      style={[styles.bmiDot, { backgroundColor: bmiCategory.color }]}
                    />
                    <Text
                      style={[styles.bmiCategoryLabel, { color: bmiCategory.color }]}
                    >
                      {bmiCategory.label}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Stats Summary Row */}
              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>STARTING</Text>
                  <Text style={styles.statValue}>{startingWeight} kg</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>GOAL</Text>
                  <Text style={styles.statValue}>{goalWeight} kg</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>PROGRESS</Text>
                  <Text
                    style={[
                      styles.statValue,
                      totalChange < 0
                        ? { color: Colors.primaryDark }
                        : totalChange > 0
                        ? { color: Colors.accent }
                        : undefined,
                    ]}
                  >
                    {totalChange > 0 ? `+${totalChange}` : `${totalChange}`} kg
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Weight Line Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>WEIGHT TREND</Text>
                <Text style={styles.chartSubtitle}>Last 30 days progress</Text>
              </View>
              {goalWeight > 0 && (
                <View style={styles.goalLegendBadge}>
                  <View style={styles.goalLegendDash} />
                  <Text style={styles.goalLegendText}>Goal ({goalWeight} kg)</Text>
                </View>
              )}
            </View>

            {chartData ? (
              <View style={styles.chartWrapper}>
                <LineChart
                  data={chartData}
                  width={screenWidth - Spacing.md * 2 - 24}
                  height={200}
                  chartConfig={{
                    backgroundColor: Colors.card,
                    backgroundGradientFrom: Colors.card,
                    backgroundGradientTo: Colors.card,
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(136, 136, 136, ${opacity})`,
                    style: {
                      borderRadius: BorderRadius.lg,
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: Colors.primary,
                      fill: Colors.card,
                    },
                    propsForBackgroundLines: {
                      strokeDasharray: '3',
                      stroke: '#EEEEEE',
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
            ) : (
              <View style={styles.emptyChartBox}>
                <Ionicons name="bar-chart-outline" size={40} color={Colors.textLight} />
                <Text style={styles.emptyChartText}>
                  No weight history yet. Log your weight below to view your progress trend.
                </Text>
              </View>
            )}
          </View>

          {/* Log New Weight Entry */}
          <View style={styles.logCard}>
            <Text style={styles.logCardTitle}>LOG WEIGHT ENTRY</Text>

            <View style={styles.logInputRow}>
              <View style={styles.logInputWrapper}>
                <Ionicons name="scale-outline" size={20} color={Colors.primary} />
                <TextInput
                  style={styles.logTextInput}
                  value={inputWeight}
                  onChangeText={setInputWeight}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                  placeholderTextColor={Colors.textLight}
                  maxLength={5}
                />
                <Text style={styles.logUnitText}>kg</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.logButton}
                onPress={handleAddWeight}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={Colors.card} />
                ) : (
                  <>
                    <Ionicons name="add" size={22} color={Colors.card} />
                    <Text style={styles.logButtonText}>Add</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Quick adjust nudges */}
            <View style={styles.nudgeRow}>
              <TouchableOpacity
                style={styles.nudgePill}
                onPress={() => {
                  const current = parseFloat(inputWeight) || currentWeight;
                  setInputWeight(String(Math.round((current - 0.5) * 10) / 10));
                }}
              >
                <Text style={styles.nudgeText}>-0.5 kg</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nudgePill}
                onPress={() => {
                  const current = parseFloat(inputWeight) || currentWeight;
                  setInputWeight(String(Math.round((current - 0.1) * 10) / 10));
                }}
              >
                <Text style={styles.nudgeText}>-0.1 kg</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nudgePill}
                onPress={() => {
                  const current = parseFloat(inputWeight) || currentWeight;
                  setInputWeight(String(Math.round((current + 0.1) * 10) / 10));
                }}
              >
                <Text style={styles.nudgeText}>+0.1 kg</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nudgePill}
                onPress={() => {
                  const current = parseFloat(inputWeight) || currentWeight;
                  setInputWeight(String(Math.round((current + 0.5) * 10) / 10));
                }}
              >
                <Text style={styles.nudgeText}>+0.5 kg</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* History List */}
          <View style={styles.historySection}>
            <View style={styles.historyHeaderRow}>
              <Text style={styles.historyTitle}>WEIGHT HISTORY</Text>
              <Text style={styles.historyCount}>{entries.length} entries</Text>
            </View>

            {entries.length === 0 ? (
              <View style={styles.emptyHistoryCard}>
                <Ionicons name="calendar-outline" size={32} color={Colors.textLight} />
                <Text style={styles.emptyHistoryText}>
                  No entries logged yet. Record your first weight above.
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {entries.map((item, index) => {
                  // Previous entry chronologically is index + 1 in a DESC array
                  const prevItem = index < entries.length - 1 ? entries[index + 1] : null;
                  const diff = prevItem
                    ? Math.round((item.weight - prevItem.weight) * 10) / 10
                    : null;

                  return (
                    <View key={item.id} style={styles.historyItemCard}>
                      <View style={styles.historyLeft}>
                        <View style={styles.historyIconBubble}>
                          <Ionicons name="fitness-outline" size={20} color={Colors.primary} />
                        </View>
                        <View>
                          <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                          <Text style={styles.historyWeight}>{item.weight} kg</Text>
                        </View>
                      </View>

                      <View style={styles.historyRight}>
                        {diff !== null && (
                          <View
                            style={[
                              styles.diffBadge,
                              diff < 0
                                ? styles.diffDown
                                : diff > 0
                                ? styles.diffUp
                                : styles.diffNeutral,
                            ]}
                          >
                            <Ionicons
                              name={
                                diff < 0
                                  ? 'trending-down-outline'
                                  : diff > 0
                                  ? 'trending-up-outline'
                                  : 'remove-outline'
                              }
                              size={14}
                              color={
                                diff < 0
                                  ? Colors.primaryDark
                                  : diff > 0
                                  ? Colors.accentDark
                                  : Colors.textSecondary
                              }
                            />
                            <Text
                              style={[
                                styles.diffText,
                                diff < 0
                                  ? { color: Colors.primaryDark }
                                  : diff > 0
                                  ? { color: Colors.accentDark }
                                  : { color: Colors.textSecondary },
                              ]}
                            >
                              {diff > 0 ? `+${diff}` : `${diff}`} kg
                            </Text>
                          </View>
                        )}

                        <TouchableOpacity
                          style={styles.deleteHistoryButton}
                          onPress={() => handleDeleteEntry(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={18} color={Colors.textLight} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  heroCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  heroGradient: {
    padding: Spacing.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  heroLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  weightNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroWeightValue: {
    fontSize: FontSize.hero,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -1,
  },
  heroWeightUnit: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  bmiContainer: {
    alignItems: 'flex-end',
  },
  bmiValueText: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  bmiCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  bmiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bmiCategoryLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FontSize.xs - 1,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  chartTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  chartSubtitle: {
    fontSize: FontSize.xs - 1,
    color: Colors.textLight,
  },
  goalLegendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalLegendDash: {
    width: 14,
    height: 2,
    backgroundColor: Colors.accent,
  },
  goalLegendText: {
    fontSize: FontSize.xs,
    color: Colors.accentDark,
    fontWeight: '600',
  },
  chartWrapper: {
    alignItems: 'center',
  },
  chart: {
    marginVertical: 4,
    borderRadius: BorderRadius.lg,
  },
  emptyChartBox: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyChartText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  logCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  logCardTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  logInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  logInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 50,
  },
  logTextInput: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  logUnitText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    height: 50,
    ...Shadows.sm,
  },
  logButtonText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.card,
  },
  nudgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  nudgePill: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  nudgeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text,
  },
  historySection: {
    marginBottom: Spacing.md,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs + 2,
    paddingHorizontal: Spacing.xs,
  },
  historyTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  historyCount: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  emptyHistoryCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.sm,
  },
  emptyHistoryText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  historyList: {
    gap: Spacing.xs + 2,
  },
  historyItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  historyIconBubble: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyDate: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  historyWeight: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  diffDown: {
    backgroundColor: '#E8F5E9',
  },
  diffUp: {
    backgroundColor: '#FFF3E0',
  },
  diffNeutral: {
    backgroundColor: '#F5F5F5',
  },
  diffText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  deleteHistoryButton: {
    padding: Spacing.xs,
  },
});

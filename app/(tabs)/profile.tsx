import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useProfileStore } from '@/store/useProfileStore';
import { calculateBMI, calculateTDEE } from '@/utils/helpers';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';

const getBMICategory = (bmi: number): { label: string; color: string; bgColor: string } => {
  if (bmi <= 0) return { label: 'N/A', color: Colors.textSecondary, bgColor: '#F5F5F5' };
  if (bmi < 18.5) return { label: 'Underweight', color: '#0288D1', bgColor: '#E1F5FE' };
  if (bmi < 25) return { label: 'Normal weight', color: Colors.primaryDark, bgColor: '#E8F5E9' };
  if (bmi < 30) return { label: 'Overweight', color: Colors.accentDark, bgColor: '#FFF3E0' };
  return { label: 'Obese', color: Colors.danger, bgColor: '#FFEBEE' };
};

const getActivityLabel = (level?: string): string => {
  switch (level) {
    case 'sedentary':
      return 'Sedentary';
    case 'light':
      return 'Lightly Active';
    case 'moderate':
      return 'Moderately Active';
    case 'active':
      return 'Very Active';
    case 'very_active':
      return 'Extremely Active';
    default:
      return 'Moderate';
  }
};

const getGenderLabel = (gender?: string): string => {
  if (!gender) return 'Not specified';
  return gender.charAt(0).toUpperCase() + gender.slice(1);
};

export default function ProfileScreen() {
  const router = useRouter();

  const profile = useProfileStore((state) => state.profile);
  const storedApiKey = useProfileStore((state) => state.apiKey);
  const setApiKey = useProfileStore((state) => state.setApiKey);

  const [apiKeyInput, setApiKeyInput] = useState<string>(storedApiKey || '');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  useEffect(() => {
    setApiKeyInput(storedApiKey || '');
  }, [storedApiKey]);

  // Derived stats
  const weight = profile?.weight || 70;
  const height = profile?.height || 175;
  const age = profile?.age || 25;
  const goalWeight = profile?.goalWeight || weight;
  const bmi = calculateBMI(weight, height);
  const bmiCategory = getBMICategory(bmi);
  const tdee = profile ? calculateTDEE(profile) : 2000;

  const weightDiff = Math.round((goalWeight - weight) * 10) / 10;

  const handleSaveApiKey = () => {
    setApiKey(apiKeyInput.trim());
    Alert.alert('Saved', 'Gemini API key updated successfully!');
  };

  const handleOpenGoogleStudio = () => {
    Linking.openURL('https://aistudio.google.com/app/apikey').catch(() => {
      Alert.alert('Error', 'Unable to open browser link.');
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Text style={styles.screenTitle}>Profile & Settings</Text>
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => router.push('/onboarding?edit=true')}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={16} color={Colors.primary} />
          <Text style={styles.editProfileButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarBubble}>
            <Text style={styles.avatarInitial}>
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile?.name || 'CalorieLens User'}</Text>
            <Text style={styles.userSubtext}>
              {age} yrs • {getGenderLabel(profile?.gender)} • {getActivityLabel(profile?.activityLevel)}
            </Text>

            <View style={styles.metricsPillRow}>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Height</Text>
                <Text style={styles.metricValue}>{height} cm</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Weight</Text>
                <Text style={styles.metricValue}>{weight} kg</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Goal</Text>
                <Text style={styles.metricValue}>{goalWeight} kg</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Health & Body Stats Grid */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>Health Metrics</Text>

          <View style={styles.statsGrid}>
            {/* BMI Card */}
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Body Mass Index</Text>
              <Text style={styles.statBoxValue}>{bmi > 0 ? bmi : '--'}</Text>
              <View
                style={[
                  styles.bmiBadge,
                  { backgroundColor: bmiCategory.bgColor },
                ]}
              >
                <Text style={[styles.bmiBadgeText, { color: bmiCategory.color }]}>
                  {bmiCategory.label}
                </Text>
              </View>
            </View>

            {/* TDEE Card */}
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Maintenance TDEE</Text>
              <Text style={styles.statBoxValue}>{tdee.toLocaleString()}</Text>
              <Text style={styles.statBoxSub}>kcal / day</Text>
            </View>

            {/* Target Weight Difference */}
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Weight Target</Text>
              <Text style={styles.statBoxValue}>
                {weightDiff > 0 ? `+${weightDiff}` : `${weightDiff}`} kg
              </Text>
              <Text style={styles.statBoxSub}>
                {weightDiff === 0
                  ? 'At target goal'
                  : weightDiff > 0
                  ? 'To gain'
                  : 'To lose'}
              </Text>
            </View>
          </View>
        </View>

        {/* Weight Tracker Link Banner */}
        <TouchableOpacity
          style={styles.weightTrackerBanner}
          activeOpacity={0.8}
          onPress={() => router.push('/weight')}
        >
          <View style={styles.weightBannerLeft}>
            <View style={styles.weightBannerIcon}>
              <Ionicons name="scale-outline" size={24} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.weightBannerTitle}>Weight Tracker & Chart</Text>
              <Text style={styles.weightBannerSub}>
                Track your progress, view trends, and log updates
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>

        {/* Daily Goals Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>Daily Nutrition Goals</Text>

          <View style={styles.goalRow}>
            <View style={styles.goalRowLeft}>
              <Ionicons name="flame-outline" size={20} color={Colors.accent} />
              <Text style={styles.goalLabel}>Calories</Text>
            </View>
            <Text style={styles.goalValue}>
              {(profile?.dailyCalorieGoal || 2000).toLocaleString()} kcal
            </Text>
          </View>

          <View style={styles.goalRow}>
            <View style={styles.goalRowLeft}>
              <Ionicons name="water-outline" size={20} color={Colors.water} />
              <Text style={styles.goalLabel}>Water Intake</Text>
            </View>
            <Text style={styles.goalValue}>
              {(profile?.dailyWaterGoal || 2500).toLocaleString()} ml
            </Text>
          </View>

          <View style={styles.goalRow}>
            <View style={styles.goalRowLeft}>
              <Ionicons name="barbell-outline" size={20} color={Colors.protein} />
              <Text style={styles.goalLabel}>Protein</Text>
            </View>
            <Text style={styles.goalValue}>{profile?.proteinGoal || 150} g</Text>
          </View>

          <View style={styles.goalRow}>
            <View style={styles.goalRowLeft}>
              <Ionicons name="leaf-outline" size={20} color={Colors.carbs} />
              <Text style={styles.goalLabel}>Carbohydrates</Text>
            </View>
            <Text style={styles.goalValue}>{profile?.carbsGoal || 200} g</Text>
          </View>

          <View style={[styles.goalRow, { borderBottomWidth: 0 }]}>
            <View style={styles.goalRowLeft}>
              <Ionicons name="pizza-outline" size={20} color="#F57F17" />
              <Text style={styles.goalLabel}>Healthy Fats</Text>
            </View>
            <Text style={styles.goalValue}>{profile?.fatGoal || 65} g</Text>
          </View>
        </View>

        {/* Gemini Vision API Key Configuration */}
        <View style={styles.sectionCard}>
          <View style={styles.apiKeyHeader}>
            <Ionicons name="hardware-chip-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionHeaderTitle}>Google Gemini API Key</Text>
          </View>
          <Text style={styles.apiHelpText}>
            Used by CalorieLens to analyze meal photos and estimate nutritional values with Gemini 2.0 Flash Vision.
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.apiKeyInput}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              placeholder="Enter your Gemini API key"
              placeholderTextColor={Colors.textLight}
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowApiKey(!showApiKey)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showApiKey ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.apiActionsRow}>
            <TouchableOpacity
              style={styles.getKeyLink}
              onPress={handleOpenGoogleStudio}
              activeOpacity={0.7}
            >
              <Ionicons name="open-outline" size={14} color={Colors.primary} />
              <Text style={styles.getKeyLinkText}>Get free key from Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveKeyButton}
              onPress={handleSaveApiKey}
              activeOpacity={0.8}
            >
              <Ionicons name="save-outline" size={16} color="#FFFFFF" />
              <Text style={styles.saveKeyText}>Save Key</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info & Version */}
        <View style={styles.appInfoSection}>
          <View style={styles.appIconCircle}>
            <Ionicons name="nutrition" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>CalorieLens</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appDescription}>
            AI-driven food recognition & smart calorie tracking. Powered by Expo SDK & Google Gemini 2.0 Flash Vision.
          </Text>
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
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  editProfileButtonText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xl + 20,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.xs,
    alignItems: 'center',
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  avatarBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    ...Shadows.sm,
  },
  avatarInitial: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  userSubtext: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  metricsPillRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    gap: 6,
  },
  metricPill: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.xs + 2,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  sectionHeaderTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  statBoxLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  statBoxValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  statBoxSub: {
    fontSize: 9,
    color: Colors.textLight,
    fontWeight: '500',
    marginTop: 2,
  },
  bmiBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bmiBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  weightTrackerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  weightBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  weightBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  weightBannerTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  weightBannerSub: {
    fontSize: FontSize.xs - 1,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  goalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  goalValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  apiKeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  apiHelpText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  apiKeyInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  eyeButton: {
    padding: 6,
  },
  apiActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  getKeyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  getKeyLinkText: {
    fontSize: FontSize.xs,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  saveKeyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
    gap: 4,
  },
  saveKeyText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  appInfoSection: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
  },
  appIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  appName: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  appVersion: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  appDescription: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
    paddingHorizontal: Spacing.lg,
  },
});

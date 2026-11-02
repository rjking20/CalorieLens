import React, { useState, useMemo } from 'react';
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
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';
import { UserProfile, Gender, ActivityLevel } from '@/utils/types';
import { calculateTDEE, calculateBMI, clamp } from '@/utils/helpers';
import { useProfileStore } from '@/store/useProfileStore';
import { useWeightStore } from '@/store/useWeightStore';
import { MacroBar } from '@/components/MacroBar';

const { width } = Dimensions.get('window');

interface ActivityOption {
  id: ActivityLevel;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  multiplierText: string;
}

const ACTIVITY_OPTIONS: ActivityOption[] = [
  {
    id: 'sedentary',
    title: 'Sedentary',
    description: 'Desk job, little to no intentional physical exercise.',
    icon: 'desktop-outline',
    multiplierText: '1.2x',
  },
  {
    id: 'light',
    title: 'Lightly Active',
    description: 'Light exercise, casual walking or sports 1–3 days per week.',
    icon: 'walk-outline',
    multiplierText: '1.38x',
  },
  {
    id: 'moderate',
    title: 'Moderately Active',
    description: 'Moderate cardio or strength training 3–5 days per week.',
    icon: 'bicycle-outline',
    multiplierText: '1.55x',
  },
  {
    id: 'active',
    title: 'Active',
    description: 'High-intensity workouts or sports 6–7 days per week.',
    icon: 'barbell-outline',
    multiplierText: '1.73x',
  },
  {
    id: 'very_active',
    title: 'Very Active',
    description: 'Rigorous athletic training 2x daily or strenuous physical job.',
    icon: 'flash-outline',
    multiplierText: '1.9x',
  },
];

interface GenderOption {
  id: Gender;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const GENDER_OPTIONS: GenderOption[] = [
  {
    id: 'male',
    title: 'Male',
    subtitle: 'Standard biological male baseline',
    icon: 'male-outline',
  },
  {
    id: 'female',
    title: 'Female',
    subtitle: 'Standard biological female baseline',
    icon: 'female-outline',
  },
  {
    id: 'other',
    title: 'Other',
    subtitle: 'Balanced metabolic baseline',
    icon: 'person-outline',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = params.mode === 'edit';

  const existingProfile = useProfileStore((state) => state.profile);
  const existingApiKey = useProfileStore((state) => state.apiKey);
  const setProfile = useProfileStore((state) => state.setProfile);
  const setOnboarded = useProfileStore((state) => state.setOnboarded);
  const setStoreApiKey = useProfileStore((state) => state.setApiKey);
  const addWeight = useWeightStore((state) => state.addWeight);

  // Flow step (1 to 7)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 7;

  // Form states
  const [name, setName] = useState<string>(existingProfile?.name ?? '');
  const [gender, setGender] = useState<Gender>(existingProfile?.gender ?? 'male');
  const [age, setAge] = useState<string>(existingProfile?.age ? String(existingProfile.age) : '28');
  const [height, setHeight] = useState<string>(
    existingProfile?.height ? String(existingProfile.height) : '175'
  );
  const [weight, setWeight] = useState<string>(
    existingProfile?.weight ? String(existingProfile.weight) : '72'
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    existingProfile?.activityLevel ?? 'moderate'
  );
  const [goalWeight, setGoalWeight] = useState<string>(
    existingProfile?.goalWeight ? String(existingProfile.goalWeight) : '68'
  );

  // Manual calorie override state (if user customizes in step 6)
  const [customCalorieGoal, setCustomCalorieGoal] = useState<number | null>(
    existingProfile?.dailyCalorieGoal ?? null
  );

  // Gemini API key state
  const [apiKey, setApiKey] = useState<string>(existingApiKey ?? '');
  const [isApiKeyVisible, setIsApiKeyVisible] = useState<boolean>(false);

  // Parse numeric values safely
  const parsedAge = clamp(parseInt(age, 10) || 28, 10, 110);
  const parsedHeight = clamp(parseFloat(height) || 175, 50, 260);
  const parsedWeight = clamp(parseFloat(weight) || 72, 20, 350);
  const parsedGoalWeight = clamp(parseFloat(goalWeight) || 68, 20, 350);

  // Calculated values
  const currentBMI = useMemo(() => {
    return calculateBMI(parsedWeight, parsedHeight);
  }, [parsedWeight, parsedHeight]);

  const calculatedTDEE = useMemo(() => {
    const dummyProfile: UserProfile = {
      name: name || 'User',
      age: parsedAge,
      height: parsedHeight,
      weight: parsedWeight,
      goalWeight: parsedGoalWeight,
      gender,
      activityLevel,
      dailyCalorieGoal: 2000,
      dailyWaterGoal: 2500,
      proteinGoal: 150,
      carbsGoal: 200,
      fatGoal: 65,
    };
    return calculateTDEE(dummyProfile);
  }, [name, parsedAge, parsedHeight, parsedWeight, parsedGoalWeight, gender, activityLevel]);

  // Suggested daily calories based on weight goal
  const suggestedCalories = useMemo(() => {
    const weightDiff = parsedGoalWeight - parsedWeight;
    if (weightDiff < -1) {
      // Weight loss: modest deficit (~400 kcal)
      return Math.max(1200, Math.round(calculatedTDEE - 400));
    } else if (weightDiff > 1) {
      // Weight gain / lean bulk: modest surplus (~300 kcal)
      return Math.round(calculatedTDEE + 300);
    }
    // Maintenance
    return calculatedTDEE;
  }, [parsedWeight, parsedGoalWeight, calculatedTDEE]);

  const activeCalorieGoal = customCalorieGoal !== null ? customCalorieGoal : suggestedCalories;

  // Suggested macros split: 40% carbs (4 kcal/g), 30% protein (4 kcal/g), 30% fat (9 kcal/g)
  const macroBreakdown = useMemo(() => {
    const carbsGrams = Math.round((activeCalorieGoal * 0.4) / 4);
    const proteinGrams = Math.round((activeCalorieGoal * 0.3) / 4);
    const fatGrams = Math.round((activeCalorieGoal * 0.3) / 9);
    // Water goal: ~35ml per kg of body weight, rounded to 50ml
    const waterGoalMl = Math.round((parsedWeight * 35) / 50) * 50;
    return {
      carbsGrams,
      proteinGrams,
      fatGrams,
      waterGoalMl: Math.max(1500, waterGoalMl),
    };
  }, [activeCalorieGoal, parsedWeight]);

  // Step Validation
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!name.trim()) {
          Alert.alert('Name Required', 'Please enter your name or nickname to continue.');
          return false;
        }
        return true;
      case 2:
        return true;
      case 3:
        if (!age || parseInt(age, 10) < 12 || parseInt(age, 10) > 115) {
          Alert.alert('Invalid Age', 'Please enter a valid age between 12 and 115.');
          return false;
        }
        if (!height || parseFloat(height) < 90 || parseFloat(height) > 250) {
          Alert.alert('Invalid Height', 'Please enter a valid height in cm (90 - 250 cm).');
          return false;
        }
        if (!weight || parseFloat(weight) < 25 || parseFloat(weight) > 300) {
          Alert.alert('Invalid Weight', 'Please enter a valid weight in kg (25 - 300 kg).');
          return false;
        }
        return true;
      case 4:
        return true;
      case 5:
        if (!goalWeight || parseFloat(goalWeight) < 25 || parseFloat(goalWeight) > 300) {
          Alert.alert('Invalid Goal Weight', 'Please enter a realistic goal weight in kg.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      finishOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else if (isEditMode) {
      router.back();
    }
  };

  const finishOnboarding = async () => {
    const finalProfile: UserProfile = {
      name: name.trim(),
      gender,
      age: parsedAge,
      height: parsedHeight,
      weight: parsedWeight,
      goalWeight: parsedGoalWeight,
      activityLevel,
      dailyCalorieGoal: activeCalorieGoal,
      dailyWaterGoal: macroBreakdown.waterGoalMl,
      proteinGoal: macroBreakdown.proteinGrams,
      carbsGoal: macroBreakdown.carbsGrams,
      fatGoal: macroBreakdown.fatGrams,
    };

    setProfile(finalProfile);
    setOnboarded(true);

    if (apiKey.trim()) {
      setStoreApiKey(apiKey.trim());
    }

    // Save initial weight record to history if new setup
    if (!existingProfile) {
      try {
        await addWeight(parsedWeight);
      } catch (err) {
        console.warn('Initial weight save note:', err);
      }
    }

    if (isEditMode) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  // RENDER STEP CONTENT
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.heroIconBubble}>
              <Ionicons name="sparkles" size={38} color={Colors.card} />
            </View>
            <Text style={styles.stepTitle}>Welcome to CalorieLens</Text>
            <Text style={styles.stepDescription}>
              Smart, effortless nutrition tracking powered by Gemini Vision AI. Let's build your
              personalized health plan.
            </Text>

            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>WHAT SHOULD WE CALL YOU?</Text>
              <View style={styles.textInputWrapper}>
                <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your name"
                  placeholderTextColor={Colors.textLight}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={handleNext}
                />
              </View>
            </View>

            <View style={styles.tipBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
              <Text style={styles.tipText}>
                Your data stays strictly local and private on your phone.
              </Text>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What is your gender?</Text>
            <Text style={styles.stepDescription}>
              Biological sex affects basal metabolic rate (BMR) calculations in clinical formulas.
            </Text>

            <View style={styles.cardGroup}>
              {GENDER_OPTIONS.map((item) => {
                const isSelected = gender === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    style={[styles.selectCard, isSelected && styles.selectCardActive]}
                    onPress={() => setGender(item.id)}
                  >
                    <View
                      style={[
                        styles.selectCardIconBubble,
                        isSelected && { backgroundColor: Colors.primaryLight },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={26}
                        color={isSelected ? Colors.primaryDark : Colors.textSecondary}
                      />
                    </View>
                    <View style={styles.selectCardTextContainer}>
                      <Text style={[styles.selectCardTitle, isSelected && styles.textPrimaryActive]}>
                        {item.title}
                      </Text>
                      <Text style={styles.selectCardSubtitle}>{item.subtitle}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Your Body Metrics</Text>
            <Text style={styles.stepDescription}>
              We need your age, height, and current weight to calculate your metabolic baseline.
            </Text>

            <View style={styles.cardGroup}>
              {/* Age */}
              <View style={styles.metricInputCard}>
                <View style={styles.metricHeaderRow}>
                  <View style={styles.metricLabelRow}>
                    <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                    <Text style={styles.metricLabel}>AGE</Text>
                  </View>
                  <Text style={styles.metricUnit}>Years</Text>
                </View>
                <TextInput
                  style={styles.metricValueInput}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="number-pad"
                  placeholder="28"
                  placeholderTextColor={Colors.textLight}
                  maxLength={3}
                />
              </View>

              {/* Height */}
              <View style={styles.metricInputCard}>
                <View style={styles.metricHeaderRow}>
                  <View style={styles.metricLabelRow}>
                    <Ionicons name="resize-outline" size={18} color={Colors.accent} />
                    <Text style={styles.metricLabel}>HEIGHT</Text>
                  </View>
                  <Text style={styles.metricUnit}>cm</Text>
                </View>
                <TextInput
                  style={styles.metricValueInput}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                  placeholder="175"
                  placeholderTextColor={Colors.textLight}
                  maxLength={4}
                />
              </View>

              {/* Weight */}
              <View style={styles.metricInputCard}>
                <View style={styles.metricHeaderRow}>
                  <View style={styles.metricLabelRow}>
                    <Ionicons name="scale-outline" size={18} color={Colors.water} />
                    <Text style={styles.metricLabel}>CURRENT WEIGHT</Text>
                  </View>
                  <Text style={styles.metricUnit}>kg</Text>
                </View>
                <TextInput
                  style={styles.metricValueInput}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="72"
                  placeholderTextColor={Colors.textLight}
                  maxLength={5}
                />
              </View>
            </View>

            {parsedHeight > 0 && parsedWeight > 0 && (
              <View style={styles.bmiPreviewBadge}>
                <Text style={styles.bmiPreviewLabel}>Estimated BMI:</Text>
                <Text style={styles.bmiPreviewValue}>{currentBMI} kg/m²</Text>
              </View>
            )}
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>How active are you?</Text>
            <Text style={styles.stepDescription}>
              Daily activity substantially impacts how many calories you burn each day.
            </Text>

            <View style={styles.cardGroup}>
              {ACTIVITY_OPTIONS.map((item) => {
                const isSelected = activityLevel === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    style={[styles.selectCard, isSelected && styles.selectCardActive]}
                    onPress={() => setActivityLevel(item.id)}
                  >
                    <View
                      style={[
                        styles.selectCardIconBubble,
                        isSelected && { backgroundColor: Colors.primaryLight },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={24}
                        color={isSelected ? Colors.primaryDark : Colors.textSecondary}
                      />
                    </View>
                    <View style={styles.selectCardTextContainer}>
                      <View style={styles.activityTitleRow}>
                        <Text
                          style={[styles.selectCardTitle, isSelected && styles.textPrimaryActive]}
                        >
                          {item.title}
                        </Text>
                        <Text style={styles.multiplierBadge}>{item.multiplierText}</Text>
                      </View>
                      <Text style={styles.selectCardSubtitle}>{item.description}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 5: {
        const weightDiff = Math.round((parsedGoalWeight - parsedWeight) * 10) / 10;
        let goalCategory = 'Maintain weight';
        let goalBadgeColor = Colors.primary;
        let goalNote = 'Maintain your current weight with healthy balanced nutrition.';

        if (weightDiff < -0.5) {
          goalCategory = `Lose ${Math.abs(weightDiff)} kg`;
          goalBadgeColor = Colors.accent;
          goalNote = 'Healthy weight loss: ~400 kcal deficit per day for steady fat loss.';
        } else if (weightDiff > 0.5) {
          goalCategory = `Gain ${weightDiff} kg`;
          goalBadgeColor = Colors.water;
          goalNote = 'Healthy weight/muscle gain: ~300 kcal surplus to fuel growth.';
        }

        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What is your goal weight?</Text>
            <Text style={styles.stepDescription}>
              Whether you want to lean down, build muscle, or stay right where you are.
            </Text>

            <View style={styles.goalWeightBox}>
              <Text style={styles.goalWeightLabel}>TARGET WEIGHT</Text>
              <View style={styles.goalInputRow}>
                <TextInput
                  style={styles.goalWeightInput}
                  value={goalWeight}
                  onChangeText={setGoalWeight}
                  keyboardType="decimal-pad"
                  placeholder="68"
                  placeholderTextColor={Colors.textLight}
                  maxLength={5}
                />
                <Text style={styles.goalWeightUnit}>kg</Text>
              </View>

              {/* Status comparison */}
              <View style={[styles.goalStatusPill, { backgroundColor: `${goalBadgeColor}15` }]}>
                <Ionicons
                  name={
                    weightDiff < -0.5
                      ? 'trending-down-outline'
                      : weightDiff > 0.5
                      ? 'trending-up-outline'
                      : 'remove-outline'
                  }
                  size={18}
                  color={goalBadgeColor}
                />
                <Text style={[styles.goalStatusText, { color: goalBadgeColor }]}>
                  {goalCategory}
                </Text>
              </View>
            </View>

            <View style={styles.tipBox}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.tipText}>{goalNote}</Text>
            </View>

            <View style={styles.comparisonRow}>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>CURRENT</Text>
                <Text style={styles.comparisonValue}>{parsedWeight} kg</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={Colors.textLight} />
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>TARGET</Text>
                <Text style={styles.comparisonValue}>{parsedGoalWeight} kg</Text>
              </View>
            </View>
          </View>
        );
      }

      case 6:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Your Daily Plan</Text>
            <Text style={styles.stepDescription}>
              Calculated using the clinical Mifflin-St Jeor equation and standard sports nutrition
              macro distribution (40% carbs / 30% protein / 30% fat).
            </Text>

            {/* Calories Card */}
            <View style={styles.calorieCard}>
              <View style={styles.calorieCardHeader}>
                <View>
                  <Text style={styles.calorieCardSub}>DAILY TARGET</Text>
                  <Text style={styles.calorieCardNumber}>{activeCalorieGoal}</Text>
                </View>
                <View style={styles.calorieUnitBadge}>
                  <Text style={styles.calorieUnitText}>kcal / day</Text>
                </View>
              </View>

              {/* TDEE baseline comparison */}
              <View style={styles.tdeeDivider} />
              <View style={styles.tdeeRow}>
                <Text style={styles.tdeeText}>Maintenance TDEE:</Text>
                <Text style={styles.tdeeBold}>{calculatedTDEE} kcal</Text>
              </View>

              {/* Calorie fine-tuning adjuster */}
              <View style={styles.adjustRow}>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() =>
                    setCustomCalorieGoal(Math.max(1000, (activeCalorieGoal || 2000) - 50))
                  }
                >
                  <Ionicons name="remove" size={20} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.adjustLabel}>Fine-tune ±50 kcal</Text>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={() =>
                    setCustomCalorieGoal(Math.min(5000, (activeCalorieGoal || 2000) + 50))
                  }
                >
                  <Ionicons name="add" size={20} color={Colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Macro preview bar */}
            <View style={styles.macroCard}>
              <Text style={styles.macroCardTitle}>SUGGESTED MACRO SPLIT</Text>
              <MacroBar
                protein={macroBreakdown.proteinGrams}
                carbs={macroBreakdown.carbsGrams}
                fat={macroBreakdown.fatGrams}
                showPercentages={true}
                height={12}
              />

              <View style={styles.macroGrid}>
                {/* Protein */}
                <View style={[styles.macroPill, { borderColor: Colors.protein }]}>
                  <View style={[styles.macroPillDot, { backgroundColor: Colors.protein }]} />
                  <Text style={styles.macroPillGrams}>{macroBreakdown.proteinGrams}g</Text>
                  <Text style={styles.macroPillName}>Protein (30%)</Text>
                </View>

                {/* Carbs */}
                <View style={[styles.macroPill, { borderColor: Colors.carbs }]}>
                  <View style={[styles.macroPillDot, { backgroundColor: Colors.carbs }]} />
                  <Text style={styles.macroPillGrams}>{macroBreakdown.carbsGrams}g</Text>
                  <Text style={styles.macroPillName}>Carbs (40%)</Text>
                </View>

                {/* Fat */}
                <View style={[styles.macroPill, { borderColor: Colors.fat }]}>
                  <View style={[styles.macroPillDot, { backgroundColor: Colors.fat }]} />
                  <Text style={styles.macroPillGrams}>{macroBreakdown.fatGrams}g</Text>
                  <Text style={styles.macroPillName}>Fat (30%)</Text>
                </View>
              </View>
            </View>

            {/* Water Target */}
            <View style={styles.waterTargetCard}>
              <View style={styles.waterIconContainer}>
                <Ionicons name="water" size={24} color={Colors.water} />
              </View>
              <View style={styles.waterTextContainer}>
                <Text style={styles.waterTitle}>Daily Water Goal</Text>
                <Text style={styles.waterSubtitle}>
                  Tailored to your body mass for ideal hydration
                </Text>
              </View>
              <Text style={styles.waterValue}>{macroBreakdown.waterGoalMl} ml</Text>
            </View>
          </View>
        );

      case 7:
        return (
          <View style={styles.stepContainer}>
            <View style={[styles.heroIconBubble, { backgroundColor: Colors.primary }]}>
              <Ionicons name="camera-outline" size={38} color={Colors.card} />
            </View>
            <Text style={styles.stepTitle}>AI Food Recognition</Text>
            <Text style={styles.stepDescription}>
              CalorieLens connects directly to Google Gemini 2.0 Flash Vision to identify meals and
              estimate macros from your photos.
            </Text>

            <View style={styles.inputCard}>
              <View style={styles.apiKeyLabelRow}>
                <Text style={styles.inputLabel}>GEMINI API KEY (OPTIONAL)</Text>
                <TouchableOpacity onPress={() => setIsApiKeyVisible(!isApiKeyVisible)}>
                  <Text style={styles.toggleVisibilityText}>
                    {isApiKeyVisible ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.textInputWrapper}>
                <Ionicons name="key-outline" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.textInput}
                  placeholder="AIzaSy..."
                  placeholderTextColor={Colors.textLight}
                  value={apiKey}
                  onChangeText={setApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!isApiKeyVisible}
                />
                {apiKey.length > 0 && (
                  <TouchableOpacity onPress={() => setApiKey('')}>
                    <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.instructionsLinkButton}
              onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}
            >
              <Ionicons name="open-outline" size={18} color={Colors.primary} />
              <Text style={styles.instructionsLinkText}>Get a Free Gemini API Key (Google AI Studio)</Text>
            </TouchableOpacity>

            <View style={styles.tipBox}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.tipText}>
                You can skip this now and still use CalorieLens manually, or add your key anytime
                in Settings.
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header & Progress */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerBackButton, currentStep === 1 && !isEditMode && styles.hidden]}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.progressSection}>
            <Text style={styles.stepIndicatorText}>
              Step {currentStep} of {totalSteps}
            </Text>
            <View style={styles.progressBarTrack}>
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.progressBarSegment,
                    idx + 1 <= currentStep && styles.progressBarSegmentActive,
                  ]}
                />
              ))}
            </View>
          </View>

          {currentStep === 7 ? (
            <TouchableOpacity onPress={finishOnboarding} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerRightPlaceholder} />
          )}
        </View>

        {/* Scrollable Form Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>

        {/* Bottom Navigation Actions */}
        <View style={styles.bottomBar}>
          <TouchableOpacity activeOpacity={0.85} onPress={handleNext} style={styles.nextButtonWrapper}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextGradientButton}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === totalSteps
                  ? isEditMode
                    ? 'Save Profile'
                    : 'Get Started'
                  : 'Continue'}
              </Text>
              <Ionicons
                name={currentStep === totalSteps ? 'checkmark-circle-outline' : 'arrow-forward'}
                size={20}
                color={Colors.card}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
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
  hidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  headerRightPlaceholder: {
    width: 40,
  },
  skipButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  skipButtonText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  progressSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  stepIndicatorText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  progressBarTrack: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 240,
    height: 6,
    gap: 4,
  },
  progressBarSegment: {
    flex: 1,
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#E0E0E0',
  },
  progressBarSegmentActive: {
    backgroundColor: Colors.primary,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  stepContainer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  heroIconBubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  stepTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
  },
  stepDescription: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  inputCard: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  textInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  tipBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 19,
  },
  cardGroup: {
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  selectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: '#EEEEEE',
    ...Shadows.sm,
  },
  selectCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F4FAF4',
  },
  selectCardIconBubble: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  selectCardTextContainer: {
    flex: 1,
  },
  selectCardTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  textPrimaryActive: {
    color: Colors.primaryDark,
  },
  selectCardSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: Spacing.sm,
  },
  multiplierBadge: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primaryDark,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  radioCircleSelected: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  metricInputCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  metricHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  metricUnit: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  metricValueInput: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    paddingVertical: Spacing.xs,
  },
  bmiPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  bmiPreviewLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  bmiPreviewValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  goalWeightBox: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  goalWeightLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  goalInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  goalWeightInput: {
    fontSize: FontSize.hero,
    fontWeight: '900',
    color: Colors.text,
    minWidth: 100,
    textAlign: 'center',
  },
  goalWeightUnit: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  goalStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  goalStatusText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  comparisonRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  comparisonItem: {
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  comparisonValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  calorieCard: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  calorieCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calorieCardSub: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primaryDark,
    letterSpacing: 0.8,
  },
  calorieCardNumber: {
    fontSize: FontSize.hero,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -1,
  },
  calorieUnitBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  calorieUnitText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  tdeeDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: Spacing.md,
  },
  tdeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tdeeText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  tdeeBold: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
  },
  adjustButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  adjustLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  macroCard: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  macroCardTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  macroPill: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  macroPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  macroPillGrams: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.text,
  },
  macroPillName: {
    fontSize: FontSize.xs - 1,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  waterTargetCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  waterIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  waterTextContainer: {
    flex: 1,
  },
  waterTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  waterSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  waterValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.water,
  },
  apiKeyLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleVisibilityText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
  instructionsLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.md,
  },
  instructionsLinkText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  nextButtonWrapper: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  nextGradientButton: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  nextButtonText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.card,
  },
});

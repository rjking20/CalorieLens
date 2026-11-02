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
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';
import { MealEntry, MealType } from '@/utils/types';
import { formatDate, getMealTypeIcon, getMealTypeColor, clamp } from '@/utils/helpers';
import { useMealStore } from '@/store/useMealStore';
import { getDb } from '@/services/database';
import { MacroBar } from '@/components/MacroBar';

const { width } = Dimensions.get('window');

const MEAL_TYPES: { type: MealType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { type: 'lunch', label: 'Lunch', icon: 'restaurant-outline' },
  { type: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { type: 'snack', label: 'Snack', icon: 'nutrition-outline' },
];

export default function MealDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const mealId = params.id;

  const { meals, todayMeals, updateMeal, deleteMeal, isLoading: storeLoading } = useMealStore();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [meal, setMeal] = useState<MealEntry | null>(null);

  // Editable form fields
  const [foodName, setFoodName] = useState<string>('');
  const [calories, setCalories] = useState<string>('');
  const [protein, setProtein] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [fat, setFat] = useState<string>('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Find meal from store or local SQLite database
  useEffect(() => {
    let isMounted = true;

    const findMeal = () => {
      if (!mealId) {
        setIsLoading(false);
        return;
      }

      // Check store first
      const storeMeal =
        meals.find((m) => m.id === mealId) || todayMeals.find((m) => m.id === mealId);

      if (storeMeal) {
        if (isMounted) {
          initFormData(storeMeal);
          setIsLoading(false);
        }
        return;
      }

      // Fallback: Query SQLite database directly
      try {
        const db = getDb();
        const row = db.getFirstSync<MealEntry>('SELECT * FROM meals WHERE id = ?', [mealId]);
        if (isMounted) {
          if (row) {
            initFormData({
              ...row,
              imageUri: row.imageUri || undefined,
            });
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching meal from DB:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    findMeal();

    return () => {
      isMounted = false;
    };
  }, [mealId, meals, todayMeals]);

  const initFormData = (item: MealEntry) => {
    setMeal(item);
    setFoodName(item.foodName);
    setCalories(String(Math.round(item.calories)));
    setProtein(String(Math.round((item.protein || 0) * 10) / 10));
    setCarbs(String(Math.round((item.carbs || 0) * 10) / 10));
    setFat(String(Math.round((item.fat || 0) * 10) / 10));
    setMealType(item.mealType);
    setImageUri(item.imageUri);
  };

  const parsedCalories = Math.max(0, parseFloat(calories) || 0);
  const parsedProtein = Math.max(0, parseFloat(protein) || 0);
  const parsedCarbs = Math.max(0, parseFloat(carbs) || 0);
  const parsedFat = Math.max(0, parseFloat(fat) || 0);

  // Formatted date and time strings
  const formattedDateTime = useMemo(() => {
    if (!meal?.date && !meal?.createdAt) return '';
    try {
      const d = new Date(meal.createdAt || meal.date);
      if (isNaN(d.getTime())) {
        return formatDate(meal.date);
      }
      const datePart = formatDate(d);
      const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${datePart} • ${timePart}`;
    } catch {
      return meal.date;
    }
  }, [meal]);

  const handleSave = async () => {
    if (!meal) return;

    if (!foodName.trim()) {
      Alert.alert('Required', 'Please enter a name for this meal.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedEntry: MealEntry = {
        ...meal,
        foodName: foodName.trim(),
        calories: parsedCalories,
        protein: parsedProtein,
        carbs: parsedCarbs,
        fat: parsedFat,
        mealType,
        imageUri,
      };

      await updateMeal(updatedEntry);
      router.back();
    } catch (err) {
      console.error('Failed to update meal:', err);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!meal) return;

    Alert.alert(
      'Delete Meal',
      `Are you sure you want to delete "${meal.foodName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMeal(meal.id);
              router.back();
            } catch (err) {
              console.error('Failed to delete meal:', err);
              Alert.alert('Error', 'Failed to delete meal. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading meal details...</Text>
      </SafeAreaView>
    );
  }

  if (!meal) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.textSecondary} />
        <Text style={styles.notFoundTitle}>Meal Not Found</Text>
        <Text style={styles.notFoundText}>
          The requested meal could not be loaded or may have been deleted.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const mealColor = getMealTypeColor(mealType);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Meal Details</Text>

          <TouchableOpacity
            style={[styles.headerIconButton, styles.deleteHeaderButton]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={22} color={Colors.danger} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Banner / Meal Image */}
          {imageUri ? (
            <View style={styles.imageCard}>
              <Image source={{ uri: imageUri }} style={styles.mealImage} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.55)']}
                style={styles.imageGradientOverlay}
              >
                <View style={styles.imagePill}>
                  <Ionicons name={getMealTypeIcon(mealType)} size={16} color={Colors.card} />
                  <Text style={styles.imagePillText}>
                    {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <View style={[styles.fallbackHeroCard, { backgroundColor: `${mealColor}15` }]}>
              <View style={[styles.fallbackIconBubble, { backgroundColor: mealColor }]}>
                <Ionicons name={getMealTypeIcon(mealType)} size={36} color={Colors.card} />
              </View>
              <Text style={[styles.fallbackMealTypeText, { color: mealColor }]}>
                {mealType.toUpperCase()}
              </Text>
              {formattedDateTime ? (
                <Text style={styles.fallbackDateText}>{formattedDateTime}</Text>
              ) : null}
            </View>
          )}

          {/* Date & Time Badge (if image is shown) */}
          {imageUri && formattedDateTime ? (
            <View style={styles.timestampContainer}>
              <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.timestampText}>{formattedDateTime}</Text>
            </View>
          ) : null}

          {/* Meal Type Selection Row */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>MEAL TYPE</Text>
            <View style={styles.mealTypeRow}>
              {MEAL_TYPES.map((item) => {
                const isSelected = mealType === item.type;
                const tabColor = getMealTypeColor(item.type);
                return (
                  <TouchableOpacity
                    key={item.type}
                    activeOpacity={0.75}
                    style={[
                      styles.mealTypeTab,
                      isSelected && {
                        backgroundColor: tabColor,
                        borderColor: tabColor,
                      },
                    ]}
                    onPress={() => setMealType(item.type)}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={isSelected ? Colors.card : Colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.mealTypeTabText,
                        isSelected && styles.mealTypeTabTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Food Name Input */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>FOOD NAME</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="pencil-outline" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.foodNameInput}
                value={foodName}
                onChangeText={setFoodName}
                placeholder="Enter meal name"
                placeholderTextColor={Colors.textLight}
              />
              {foodName.length > 0 && (
                <TouchableOpacity onPress={() => setFoodName('')}>
                  <Ionicons name="close-circle" size={18} color={Colors.textLight} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Calorie Highlight Card */}
          <View style={styles.calorieCard}>
            <View style={styles.calorieLeftCol}>
              <View style={styles.flameIconBubble}>
                <Ionicons name="flame" size={26} color={Colors.accent} />
              </View>
              <View>
                <Text style={styles.calorieCardLabel}>TOTAL CALORIES</Text>
                <Text style={styles.calorieCardSub}>Energy value</Text>
              </View>
            </View>

            <View style={styles.calorieInputGroup}>
              <TextInput
                style={styles.calorieNumberInput}
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textLight}
                maxLength={5}
              />
              <Text style={styles.calorieUnit}>kcal</Text>
            </View>
          </View>

          {/* Macro Breakdown Inputs */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>MACRONUTRIENTS (GRAMS)</Text>
            <View style={styles.macrosRow}>
              {/* Protein */}
              <View style={[styles.macroBox, { borderColor: Colors.protein }]}>
                <View style={styles.macroBoxHeader}>
                  <View style={[styles.macroDot, { backgroundColor: Colors.protein }]} />
                  <Text style={[styles.macroBoxName, { color: Colors.protein }]}>Protein</Text>
                </View>
                <View style={styles.macroInputRow}>
                  <TextInput
                    style={styles.macroInput}
                    value={protein}
                    onChangeText={setProtein}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.textLight}
                    maxLength={5}
                  />
                  <Text style={styles.macroInputUnit}>g</Text>
                </View>
              </View>

              {/* Carbs */}
              <View style={[styles.macroBox, { borderColor: Colors.carbs }]}>
                <View style={styles.macroBoxHeader}>
                  <View style={[styles.macroDot, { backgroundColor: Colors.carbs }]} />
                  <Text style={[styles.macroBoxName, { color: Colors.carbs }]}>Carbs</Text>
                </View>
                <View style={styles.macroInputRow}>
                  <TextInput
                    style={styles.macroInput}
                    value={carbs}
                    onChangeText={setCarbs}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.textLight}
                    maxLength={5}
                  />
                  <Text style={styles.macroInputUnit}>g</Text>
                </View>
              </View>

              {/* Fat */}
              <View style={[styles.macroBox, { borderColor: Colors.fat }]}>
                <View style={styles.macroBoxHeader}>
                  <View style={[styles.macroDot, { backgroundColor: Colors.fat }]} />
                  <Text style={[styles.macroBoxName, { color: '#C7A600' }]}>Fat</Text>
                </View>
                <View style={styles.macroInputRow}>
                  <TextInput
                    style={styles.macroInput}
                    value={fat}
                    onChangeText={setFat}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.textLight}
                    maxLength={5}
                  />
                  <Text style={styles.macroInputUnit}>g</Text>
                </View>
              </View>
            </View>

            {/* Live Macro Distribution Bar */}
            <View style={styles.macroBarContainer}>
              <MacroBar
                protein={parsedProtein}
                carbs={parsedCarbs}
                fat={parsedFat}
                showLabels={true}
                showPercentages={true}
                height={10}
              />
            </View>
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={isSaving}
            style={styles.saveButtonWrapper}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveGradientButton}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.card} />
              ) : (
                <>
                  <Ionicons name="checkmark-sharp" size={20} color={Colors.card} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.deleteSecondaryButton}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            <Text style={styles.deleteSecondaryText}>Delete Meal</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  notFoundTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  notFoundText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  backButtonText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  deleteHeaderButton: {
    backgroundColor: '#FFEBEE',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  imageCard: {
    width: '100%',
    height: 220,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    backgroundColor: '#E0E0E0',
    ...Shadows.md,
  },
  mealImage: {
    width: '100%',
    height: '100%',
  },
  imageGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  imagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  imagePillText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.card,
    letterSpacing: 0.5,
  },
  fallbackHeroCard: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  fallbackIconBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  fallbackMealTypeText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    letterSpacing: 1,
  },
  fallbackDateText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  timestampText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs + 2,
    paddingHorizontal: Spacing.xs,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  mealTypeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  mealTypeTabText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  mealTypeTabTextActive: {
    color: Colors.card,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 52,
    ...Shadows.sm,
  },
  foodNameInput: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  calorieCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md + 2,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  calorieLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  flameIconBubble: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calorieCardLabel: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 0.5,
  },
  calorieCardSub: {
    fontSize: FontSize.xs - 1,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  calorieInputGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calorieNumberInput: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    color: Colors.text,
    minWidth: 60,
    textAlign: 'right',
  },
  calorieUnit: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  macroBox: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm + 2,
    borderWidth: 1.5,
    ...Shadows.sm,
  },
  macroBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroBoxName: {
    fontSize: FontSize.xs - 1,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  macroInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  macroInput: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.text,
    flex: 1,
  },
  macroInputUnit: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  macroBarContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    ...Shadows.sm,
  },
  bottomBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  saveButtonWrapper: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  saveGradientButton: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.card,
  },
  deleteSecondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  deleteSecondaryText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.danger,
  },
});

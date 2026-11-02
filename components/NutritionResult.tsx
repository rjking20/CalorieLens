import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NutritionInfo, MealType } from '@/utils/types';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';
import { MacroBar } from './MacroBar';

export interface NutritionResultProps {
  result: NutritionInfo | null;
  visible: boolean;
  onConfirm: (mealType: string) => void;
  onEdit: (result: NutritionInfo) => void;
  onClose: () => void;
}

interface MealTypeOption {
  key: MealType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const MEAL_TYPES: MealTypeOption[] = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny' },
  { key: 'lunch', label: 'Lunch', icon: 'restaurant' },
  { key: 'dinner', label: 'Dinner', icon: 'moon' },
  { key: 'snack', label: 'Snack', icon: 'cafe' },
];

const getDefaultMealType = (): MealType => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 21) return 'dinner';
  return 'snack';
};

export const NutritionResult: React.FC<NutritionResultProps> = ({
  result,
  visible,
  onConfirm,
  onEdit,
  onClose,
}) => {
  const [selectedMealType, setSelectedMealType] = useState<MealType>(getDefaultMealType());

  // Update default meal type when modal becomes visible
  useEffect(() => {
    if (visible) {
      setSelectedMealType(getDefaultMealType());
    }
  }, [visible]);

  if (!result) return null;

  // Format confidence percentage
  const confidencePercent =
    result.confidence <= 1
      ? Math.round(result.confidence * 100)
      : Math.round(result.confidence);

  const isHighConfidence = confidencePercent >= 75;
  const isMediumConfidence = confidencePercent >= 50 && confidencePercent < 75;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop dismiss pressable */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Modal Card / Bottom Sheet */}
        <View style={styles.cardContainer}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.titleWrapper}>
              <Ionicons
                name="sparkles"
                size={18}
                color={Colors.accent}
                style={styles.headerIcon}
              />
              <Text style={styles.headerTitle}>AI Nutrition Analysis</Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Food Name & Confidence Badge */}
            <View style={styles.foodNameSection}>
              <Text style={styles.foodName}>{result.foodName}</Text>

              <View
                style={[
                  styles.confidenceBadge,
                  isHighConfidence
                    ? styles.badgeHigh
                    : isMediumConfidence
                    ? styles.badgeMed
                    : styles.badgeLow,
                ]}
              >
                <Ionicons
                  name={isHighConfidence ? 'checkmark-circle' : 'information-circle'}
                  size={13}
                  color={
                    isHighConfidence
                      ? Colors.primaryDark
                      : isMediumConfidence
                      ? '#E65100'
                      : Colors.textSecondary
                  }
                  style={styles.confidenceIcon}
                />
                <Text
                  style={[
                    styles.confidenceText,
                    {
                      color: isHighConfidence
                        ? Colors.primaryDark
                        : isMediumConfidence
                        ? '#E65100'
                        : Colors.textSecondary,
                    },
                  ]}
                >
                  {confidencePercent}% match
                </Text>
              </View>
            </View>

            {/* Serving Size If Available */}
            {result.servingSize ? (
              <View style={styles.servingRow}>
                <Ionicons name="scale-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.servingText}>
                  Serving size: {result.servingSize}
                </Text>
              </View>
            ) : null}

            {/* Prominent Calories Display */}
            <View style={styles.calorieBox}>
              <View style={styles.calorieIconBubble}>
                <Ionicons name="flame" size={28} color={Colors.accentDark} />
              </View>
              <View style={styles.calorieValueWrapper}>
                <Text style={styles.calorieNumber}>
                  {Math.round(result.calories).toLocaleString()}
                </Text>
                <Text style={styles.calorieUnit}>total calories (kcal)</Text>
              </View>
            </View>

            {/* Macro Breakdown Section */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Macronutrients</Text>
              <MacroBar
                protein={result.protein}
                carbs={result.carbs}
                fat={result.fat}
                showLabels={true}
                showPercentages={true}
                height={12}
              />
            </View>

            {/* Meal Type Selection */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Log as Meal Type</Text>
              <View style={styles.mealTypesGrid}>
                {MEAL_TYPES.map((type) => {
                  const isSelected = selectedMealType === type.key;
                  return (
                    <TouchableOpacity
                      key={type.key}
                      activeOpacity={0.7}
                      onPress={() => setSelectedMealType(type.key)}
                      style={[
                        styles.mealTypeButton,
                        isSelected && styles.mealTypeButtonSelected,
                      ]}
                    >
                      <Ionicons
                        name={type.icon}
                        size={16}
                        color={isSelected ? '#FFFFFF' : Colors.textSecondary}
                        style={styles.mealTypeIcon}
                      />
                      <Text
                        style={[
                          styles.mealTypeLabel,
                          isSelected && styles.mealTypeLabelSelected,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons Footer */}
          <View style={styles.footerButtonsRow}>
            {/* Edit Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onEdit(result)}
              style={styles.editButton}
            >
              <Ionicons
                name="pencil-outline"
                size={18}
                color={Colors.primary}
                style={styles.buttonIcon}
              />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>

            {/* Confirm / Log Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onConfirm(selectedMealType)}
              style={styles.confirmButton}
            >
              <Ionicons
                name="checkmark-circle"
                size={18}
                color="#FFFFFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.confirmButtonText}>Log Meal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    maxHeight: '90%',
    ...Shadows.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 6,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  foodNameSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  foodName: {
    fontSize: FontSize.xxl - 2,
    fontWeight: '800',
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeHigh: {
    backgroundColor: '#E8F5E9',
  },
  badgeMed: {
    backgroundColor: '#FFF3E0',
  },
  badgeLow: {
    backgroundColor: '#F5F5F5',
  },
  confidenceIcon: {
    marginRight: 4,
  },
  confidenceText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  servingText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginLeft: 5,
    fontWeight: '500',
  },
  calorieBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  calorieIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE082',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  calorieValueWrapper: {
    flex: 1,
  },
  calorieNumber: {
    fontSize: FontSize.hero - 6,
    fontWeight: '800',
    color: '#E65100',
    lineHeight: 34,
  },
  calorieUnit: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBlock: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs + 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  mealTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealTypeButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  mealTypeButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  mealTypeIcon: {
    marginRight: 6,
  },
  mealTypeLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  mealTypeLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
  },
  editButtonText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.primary,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    ...Shadows.md,
  },
  confirmButtonText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonIcon: {
    marginRight: 6,
  },
});

export default NutritionResult;

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MealEntry, MealType } from '@/utils/types';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';

export interface MealCardProps {
  meal: MealEntry;
  onDelete?: (id: string) => void;
  onPress?: () => void;
}

const getMealTypeConfig = (type: MealType) => {
  switch (type) {
    case 'breakfast':
      return {
        label: 'Breakfast',
        icon: 'sunny' as const,
        color: '#F57C00',
        bgColor: '#FFF3E0',
      };
    case 'lunch':
      return {
        label: 'Lunch',
        icon: 'restaurant' as const,
        color: '#388E3C',
        bgColor: '#E8F5E9',
      };
    case 'dinner':
      return {
        label: 'Dinner',
        icon: 'moon' as const,
        color: '#5C6BC0',
        bgColor: '#EDE7F6',
      };
    case 'snack':
    default:
      return {
        label: 'Snack',
        icon: 'cafe' as const,
        color: '#E65100',
        bgColor: '#FBE9E7',
      };
  }
};

const formatTime = (timeString?: string): string => {
  if (!timeString) return '';
  try {
    const date = new Date(timeString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
};

export const MealCard: React.FC<MealCardProps> = ({
  meal,
  onDelete,
  onPress,
}) => {
  const mealConfig = getMealTypeConfig(meal.mealType);
  const formattedTime = formatTime(meal.createdAt);

  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert(
      'Delete Meal',
      `Are you sure you want to delete "${meal.foodName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(meal.id),
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={styles.cardContainer}
    >
      <View style={styles.contentRow}>
        {/* Meal Photo / Fallback Icon */}
        <View style={styles.imageWrapper}>
          {meal.imageUri ? (
            <Image
              source={{ uri: meal.imageUri }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.fallbackIconContainer,
                { backgroundColor: mealConfig.bgColor },
              ]}
            >
              <Ionicons
                name={mealConfig.icon}
                size={26}
                color={mealConfig.color}
              />
            </View>
          )}
        </View>

        {/* Meal Information */}
        <View style={styles.infoContainer}>
          {/* Header Row: Meal Type Badge & Time */}
          <View style={styles.headerRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: mealConfig.bgColor },
              ]}
            >
              <Ionicons
                name={mealConfig.icon}
                size={11}
                color={mealConfig.color}
                style={styles.badgeIcon}
              />
              <Text style={[styles.badgeText, { color: mealConfig.color }]}>
                {mealConfig.label}
              </Text>
            </View>

            {formattedTime ? (
              <Text style={styles.timeText}>{formattedTime}</Text>
            ) : null}
          </View>

          {/* Food Name */}
          <Text style={styles.foodName} numberOfLines={1}>
            {meal.foodName}
          </Text>

          {/* Calories & Macros Row */}
          <View style={styles.nutritionRow}>
            <Text style={styles.calorieText}>
              <Text style={styles.calorieNumber}>{Math.round(meal.calories)}</Text> kcal
            </Text>

            <View style={styles.macrosContainer}>
              <View style={[styles.macroPill, { backgroundColor: '#FFEBEE' }]}>
                <Text style={[styles.macroText, { color: Colors.protein }]}>
                  P: {Math.round(meal.protein)}g
                </Text>
              </View>
              <View style={[styles.macroPill, { backgroundColor: '#FFF3E0' }]}>
                <Text style={[styles.macroText, { color: Colors.carbs }]}>
                  C: {Math.round(meal.carbs)}g
                </Text>
              </View>
              <View style={[styles.macroPill, { backgroundColor: '#FFFDE7' }]}>
                <Text style={[styles.macroText, { color: '#F57F17' }]}>
                  F: {Math.round(meal.fat)}g
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Delete Action Button */}
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={`Delete ${meal.foodName}`}
          >
            <Ionicons name="trash-outline" size={19} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 4,
    marginVertical: Spacing.xs + 2,
    marginHorizontal: Spacing.sm,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageWrapper: {
    marginRight: Spacing.sm + 2,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: '#EEEEEE',
  },
  fallbackIconContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timeText: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    fontWeight: '500',
  },
  foodName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginVertical: 2,
  },
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  calorieText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  calorieNumber: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  macrosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  macroText: {
    fontSize: 10,
    fontWeight: '700',
  },
  deleteButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MealCard;

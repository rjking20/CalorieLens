import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

export interface MacroBarProps {
  protein: number;
  carbs: number;
  fat: number;
  showLabels?: boolean;
  height?: number;
  showPercentages?: boolean;
}

export const MacroBar: React.FC<MacroBarProps> = ({
  protein,
  carbs,
  fat,
  showLabels = true,
  height = 10,
  showPercentages = false,
}) => {
  // Ensure non-negative values
  const safeProtein = Math.max(0, protein || 0);
  const safeCarbs = Math.max(0, carbs || 0);
  const safeFat = Math.max(0, fat || 0);

  const total = safeProtein + safeCarbs + safeFat;

  // Compute percentages, defaulting to 0 if total is 0
  const proteinPercent = total > 0 ? (safeProtein / total) * 100 : 0;
  const carbsPercent = total > 0 ? (safeCarbs / total) * 100 : 0;
  const fatPercent = total > 0 ? (safeFat / total) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Horizontal Multi-color Progress Bar */}
      <View style={[styles.barTrack, { height, borderRadius: height / 2 }]}>
        {total > 0 ? (
          <>
            {proteinPercent > 0 && (
              <View
                style={[
                  styles.segment,
                  {
                    width: `${proteinPercent}%`,
                    backgroundColor: Colors.protein,
                  },
                ]}
              />
            )}
            {carbsPercent > 0 && (
              <View
                style={[
                  styles.segment,
                  {
                    width: `${carbsPercent}%`,
                    backgroundColor: Colors.carbs,
                  },
                ]}
              />
            )}
            {fatPercent > 0 && (
              <View
                style={[
                  styles.segment,
                  {
                    width: `${fatPercent}%`,
                    backgroundColor: Colors.fat,
                  },
                ]}
              />
            )}
          </>
        ) : (
          <View style={styles.emptySegment} />
        )}
      </View>

      {/* Macro Legend / Labels */}
      {showLabels && (
        <View style={styles.labelsRow}>
          {/* Protein */}
          <View style={styles.labelItem}>
            <View
              style={[styles.indicatorDot, { backgroundColor: Colors.protein }]}
            />
            <Text style={styles.macroName}>Protein</Text>
            <Text style={styles.macroGrams}>
              {Math.round(safeProtein)}g
              {showPercentages && total > 0 ? ` (${Math.round(proteinPercent)}%)` : ''}
            </Text>
          </View>

          {/* Carbs */}
          <View style={styles.labelItem}>
            <View
              style={[styles.indicatorDot, { backgroundColor: Colors.carbs }]}
            />
            <Text style={styles.macroName}>Carbs</Text>
            <Text style={styles.macroGrams}>
              {Math.round(safeCarbs)}g
              {showPercentages && total > 0 ? ` (${Math.round(carbsPercent)}%)` : ''}
            </Text>
          </View>

          {/* Fat */}
          <View style={styles.labelItem}>
            <View
              style={[styles.indicatorDot, { backgroundColor: Colors.fat }]}
            />
            <Text style={styles.macroName}>Fat</Text>
            <Text style={styles.macroGrams}>
              {Math.round(safeFat)}g
              {showPercentages && total > 0 ? ` (${Math.round(fatPercent)}%)` : ''}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: Spacing.xs,
  },
  barTrack: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#EEEEEE',
    overflow: 'hidden',
  },
  segment: {
    height: '100%',
  },
  emptySegment: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  labelItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.xs,
  },
  macroName: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginRight: 4,
  },
  macroGrams: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text,
  },
});

export default MacroBar;

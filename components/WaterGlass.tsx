import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

export interface WaterGlassProps {
  current: number; // in ml
  goal: number; // in ml
  width?: number;
  height?: number;
}

export const WaterGlass: React.FC<WaterGlassProps> = ({
  current,
  goal,
  width = 120,
  height = 160,
}) => {
  const safeCurrent = Math.max(0, Math.round(current || 0));
  const safeGoal = Math.max(0, Math.round(goal || 0));

  const percentage = safeGoal > 0 ? (safeCurrent / safeGoal) * 100 : 0;
  const clampedRatio = safeGoal > 0 ? Math.min(Math.max(safeCurrent / safeGoal, 0), 1) : 0;

  const animatedHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: clampedRatio * height,
      duration: 850,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clampedRatio, height]);

  const isGoalReached = safeGoal > 0 && safeCurrent >= safeGoal;
  const remainingMl = Math.max(0, safeGoal - safeCurrent);

  return (
    <View style={styles.outerContainer}>
      {/* Visual Glass Container */}
      <View style={[styles.glassFrame, { width, height }]}>
        {/* Animated Water Fill */}
        <Animated.View
          style={[
            styles.waterFill,
            {
              height: animatedHeight,
            },
          ]}
        >
          {/* Surface ripple / highlight line */}
          <View style={styles.waterSurface} />

          {/* Decorative water bubbles */}
          <View style={styles.bubble1} />
          <View style={styles.bubble2} />
          <View style={styles.bubble3} />
        </Animated.View>

        {/* Glass Measurement Tick Marks */}
        <View style={styles.ticksContainer} pointerEvents="none">
          <View style={[styles.tickLine, { bottom: height * 0.75 }]} />
          <View style={[styles.tickLine, { bottom: height * 0.5 }]} />
          <View style={[styles.tickLine, { bottom: height * 0.25 }]} />
        </View>

        {/* Glass Reflection Highlight */}
        <View style={styles.glassReflection} pointerEvents="none" />
      </View>

      {/* Stats Below Glass */}
      <View style={styles.statsContainer}>
        {/* Main Amount */}
        <View style={styles.amountRow}>
          <Text style={styles.currentAmount}>{safeCurrent.toLocaleString()}</Text>
          <Text style={styles.goalDivider}> / </Text>
          <Text style={styles.goalAmount}>{safeGoal.toLocaleString()} ml</Text>
        </View>

        {/* Progress Percentage Badge */}
        <View
          style={[
            styles.percentBadge,
            { backgroundColor: isGoalReached ? '#E8F5E9' : '#E3F2FD' },
          ]}
        >
          <Text
            style={[
              styles.percentText,
              { color: isGoalReached ? Colors.primaryDark : Colors.water },
            ]}
          >
            {Math.round(percentage)}% completed
          </Text>
        </View>

        {/* Status Message */}
        <Text style={styles.statusMessage}>
          {isGoalReached
            ? 'Daily goal reached! 🎉'
            : `${remainingMl.toLocaleString()} ml left for today`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  glassFrame: {
    borderWidth: 3,
    borderColor: '#90CAF9',
    borderTopWidth: 1.5,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: 'rgba(227, 242, 253, 0.35)',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  waterFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.water,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
  },
  waterSurface: {
    height: 5,
    backgroundColor: '#64B5F6',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    opacity: 0.9,
  },
  bubble1: {
    position: 'absolute',
    left: '20%',
    bottom: 20,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  bubble2: {
    position: 'absolute',
    right: '25%',
    bottom: 45,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  bubble3: {
    position: 'absolute',
    left: '45%',
    bottom: 70,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  ticksContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 6,
    width: 12,
  },
  tickLine: {
    position: 'absolute',
    right: 0,
    width: 8,
    height: 2,
    backgroundColor: 'rgba(144, 202, 249, 0.8)',
    borderRadius: 1,
  },
  glassReflection: {
    position: 'absolute',
    left: 10,
    top: 8,
    bottom: 24,
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 2,
  },
  statsContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentAmount: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.water,
    letterSpacing: -0.5,
  },
  goalDivider: {
    fontSize: FontSize.lg,
    fontWeight: '400',
    color: Colors.textSecondary,
    marginHorizontal: 2,
  },
  goalAmount: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  percentBadge: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  percentText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  statusMessage: {
    marginTop: Spacing.xs,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});

export default WaterGlass;

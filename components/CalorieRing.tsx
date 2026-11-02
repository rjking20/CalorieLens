import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Colors, FontSize, Spacing } from '@/constants/theme';

export interface CalorieRingProps {
  consumed: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
}

export const CalorieRing: React.FC<CalorieRingProps> = ({
  consumed,
  goal,
  size = 180,
  strokeWidth = 14,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [animatedRatio, setAnimatedRatio] = useState(0);

  const safeConsumed = Math.max(0, Math.round(consumed || 0));
  const safeGoal = Math.max(0, Math.round(goal || 0));
  const isOverGoal = safeGoal > 0 && safeConsumed > safeGoal;
  const remaining = Math.max(0, safeGoal - safeConsumed);
  const overage = Math.max(0, safeConsumed - safeGoal);

  // SVG dimensions
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Target progress ratio (clamped to 1 for the circular arc)
  const targetRatio = safeGoal > 0 ? Math.min(safeConsumed / safeGoal, 1) : 0;

  useEffect(() => {
    const listenerId = animatedValue.addListener(({ value }) => {
      setAnimatedRatio(value);
    });

    Animated.timing(animatedValue, {
      toValue: targetRatio,
      duration: 850,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => {
      animatedValue.removeListener(listenerId);
    };
  }, [targetRatio]);

  const strokeDashoffset = circumference - animatedRatio * circumference;
  const ringColor = isOverGoal ? Colors.danger : Colors.primary;
  const trackColor = isOverGoal ? '#FFEBEE' : '#E8F5E9';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Background Track Circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Animated Progress Ring */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </G>
      </Svg>

      {/* Center Information */}
      <View style={styles.centerContent} pointerEvents="none">
        <Text style={[styles.caloriesText, { color: isOverGoal ? Colors.danger : Colors.text }]}>
          {safeConsumed.toLocaleString()}
        </Text>
        <Text style={styles.unitText}>kcal</Text>

        <View style={styles.statusContainer}>
          {isOverGoal ? (
            <Text style={styles.overText}>
              +{overage.toLocaleString()} over
            </Text>
          ) : (
            <Text style={styles.remainingText}>
              {remaining.toLocaleString()} left
            </Text>
          )}
        </View>

        <Text style={styles.goalText}>
          Goal: {safeGoal.toLocaleString()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    alignSelf: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '75%',
  },
  caloriesText: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  unitText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statusContainer: {
    marginTop: Spacing.xs,
    marginBottom: 2,
  },
  remainingText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  overText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.danger,
  },
  goalText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
});

export default CalorieRing;

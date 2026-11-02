import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/constants/theme';

export interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  subtitle?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon,
  color = Colors.primary,
  subtitle,
  onPress,
  style,
}) => {
  const content = (
    <View style={[styles.card, style]}>
      {/* Icon with tinted background bubble */}
      <View style={[styles.iconContainer, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>

      <View style={styles.textContainer}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {/* Value + Unit Row */}
        <View style={styles.valueRow}>
          <Text style={styles.value} numberOfLines={1}>
            {value}
          </Text>
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </View>

        {/* Optional Subtitle */}
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={styles.touchableWrapper}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  touchableWrapper: {
    flex: 1,
  },
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md - 2,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  textContainer: {
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  unit: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  subtitle: {
    fontSize: FontSize.xs - 1,
    color: Colors.textLight,
    marginTop: 2,
  },
});

export default StatCard;

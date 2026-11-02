import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';

export interface QuickAddButtonProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  bottom?: number;
  right?: number;
  size?: number;
}

export const QuickAddButton: React.FC<QuickAddButtonProps> = ({
  onPress,
  icon = 'add',
  accessibilityLabel = 'Add entry',
  style,
  bottom = 24,
  right = 20,
  size = 56,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          bottom,
          right,
        },
        style,
      ]}
    >
      <Ionicons
        name={icon}
        size={Math.round(size * 0.54)}
        color="#FFFFFF"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    ...Shadows.lg,
    elevation: 8,
    // Add extra shadow enhancement for Android / iOS
    ...(Platform.OS === 'android' ? { elevation: 8 } : {}),
  },
});

export default QuickAddButton;

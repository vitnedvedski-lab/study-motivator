/**
 * Бейдж с баллами
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Star } from 'lucide-react-native';
import { useAppTheme } from '../../hooks/useAppTheme';

interface PointsBadgeProps {
  points: number;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'inverse' | 'savings';
  showIcon?: boolean;
  style?: ViewStyle;
}

export const PointsBadge = React.memo<PointsBadgeProps>(({
  points,
  size = 'medium',
  variant = 'default',
  showIcon = true,
  style,
}) => {
  const palette = useAppTheme();
  const sizeMap = {
    small: { container: 28, fontSize: 12, iconSize: 12 },
    medium: { container: 36, fontSize: 16, iconSize: 16 },
    large: { container: 48, fontSize: 22, iconSize: 20 },
  };

  const { fontSize, iconSize } = sizeMap[size];

  const variantStyles = {
    default: { bg: palette.primaryContainer, text: palette.primary },
    inverse: { bg: palette.primary, text: palette.textInverse },
    savings: { bg: palette.successContainer, text: palette.success },
  };

  const colors = variantStyles[variant];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg },
        style,
      ]}
      accessibilityLabel={`${points} баллов`}
      accessibilityRole="text"
    >
      {showIcon && <Star size={iconSize} color={colors.text} fill={colors.text} />}
      <Text style={[styles.text, { fontSize, color: colors.text }]}>
        {points.toLocaleString('ru-RU')}
      </Text>
    </View>
  );
});

PointsBadge.displayName = 'PointsBadge';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
  },
});

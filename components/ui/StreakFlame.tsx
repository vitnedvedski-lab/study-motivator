/**
 * Компонент стрика (дней подряд)
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Flame } from 'lucide-react-native';
import { useAppTheme } from '../../hooks/useAppTheme';

interface StreakFlameProps {
  streak: number;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const StreakFlame = React.memo<StreakFlameProps>(({
  streak,
  size = 'medium',
  style,
}) => {
  const palette = useAppTheme();
  const sizeMap = {
    small: { fontSize: 12, iconSize: 14 },
    medium: { fontSize: 16, iconSize: 20 },
    large: { fontSize: 22, iconSize: 28 },
  };

  const { fontSize, iconSize } = sizeMap[size];
  const isActive = streak > 0;

  return (
    <View
      style={[
        styles.container,
        !isActive && styles.inactive,
        style,
      ]}
      accessibilityLabel={`Стрик ${streak} дней`}
      accessibilityRole="text"
    >
      <Flame
        size={iconSize}
        color={isActive ? '#FF6B35' : palette.textTertiary}
        fill={isActive ? '#FF6B35' : 'transparent'}
      />
      <Text style={[styles.text, { fontSize, color: isActive ? '#FF6B35' : palette.textTertiary }]}>
        {streak}
      </Text>
    </View>
  );
});

StreakFlame.displayName = 'StreakFlame';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inactive: {
    opacity: 0.7,
  },
  text: {
    fontWeight: '700',
  },
});

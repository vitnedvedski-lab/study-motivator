/**
 * Аватар пользователя/ребёнка
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface AvatarProps {
  emoji?: string;
  color?: string;
  name?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
}

export const Avatar = React.memo<AvatarProps>(({
  emoji = '👤',
  color = Colors.primary,
  name,
  size = 'medium',
}) => {
  const sizeMap = {
    small: { container: 36, fontSize: 16 },
    medium: { container: 48, fontSize: 22 },
    large: { container: 64, fontSize: 30 },
    xlarge: { container: 96, fontSize: 44 },
  };

  const { container, fontSize } = sizeMap[size];

  return (
    <View
      style={[
        styles.container,
        { width: container, height: container, backgroundColor: color },
      ]}
      accessibilityLabel={name ? `Аватар ${name}` : 'Аватар'}
      accessibilityRole="image"
    >
      <Text style={[styles.emoji, { fontSize }]}>{emoji}</Text>
    </View>
  );
});

Avatar.displayName = 'Avatar';

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  emoji: {
    lineHeight: undefined,
  },
});

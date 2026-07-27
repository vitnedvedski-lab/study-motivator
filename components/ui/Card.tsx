/**
 * Карточка контента
 */
import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '../../constants/colors';
import { blurActiveElementOnWeb } from '../../utils/webFocus';
import { useAppTheme } from '../../hooks/useAppTheme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export const Card = React.memo<CardProps>(({
  children,
  onPress,
  style,
  variant = 'default',
  padding = 'medium',
}) => {
  const palette = useAppTheme();
  const handlePress = () => {
    blurActiveElementOnWeb();
    onPress?.();
  };

  const paddingStyle = {
    none: styles.paddingNone,
    small: styles.paddingSmall,
    medium: styles.paddingMedium,
    large: styles.paddingLarge,
  }[padding];

  const cardStyles = [
    styles.base,
    styles[variant],
    paddingStyle,
    {
      backgroundColor: palette.surface,
      borderColor: palette.border,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={cardStyles}
        activeOpacity={0.9}
        accessibilityRole="button"
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
});

Card.displayName = 'Card';

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  default: {
    backgroundColor: Colors.surface,
  },
  outlined: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  elevated: {
    backgroundColor: Colors.surface,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      } as ViewStyle,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  paddingNone: { padding: 0 },
  paddingSmall: { padding: 12 },
  paddingMedium: { padding: 16 },
  paddingLarge: { padding: 24 },
});

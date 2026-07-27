/**
 * Прогресс-бар
 */
import React from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface ProgressBarProps {
  progress: number; // 0-1
  color?: string;
  backgroundColor?: string;
  height?: number;
  style?: ViewStyle;
  animated?: boolean;
}

export const ProgressBar = React.memo<ProgressBarProps>(({
  progress,
  color = Colors.primary,
  backgroundColor = Colors.divider,
  height = 8,
  style,
  animated = true,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  if (animated) {
    const animValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
      Animated.spring(animValue, {
        toValue: clampedProgress,
        useNativeDriver: false,
        friction: 8,
      }).start();
    }, [clampedProgress, animValue]);

    const widthInterpolated = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={[styles.container, { height, backgroundColor }, style]}>
        <Animated.View
          style={[styles.fill, { backgroundColor: color, width: widthInterpolated }]}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { height, backgroundColor }, style]}>
      <View style={[styles.fill, { backgroundColor: color, width: `${clampedProgress * 100}%` }]} />
    </View>
  );
});

ProgressBar.displayName = 'ProgressBar';

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});

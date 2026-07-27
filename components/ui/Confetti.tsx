/**
 * Анимация конфетти
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform, ViewStyle } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

const COLORS = ['#E8A010', '#48A16B', '#4A6FA5', '#D44040', '#7B6DB5', '#D4883A', '#FFD700'];
const SHAPE_COUNT = 40;

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
}

interface ConfettiProps {
  active: boolean;
  onComplete?: () => void;
}

export const Confetti: React.FC<ConfettiProps> = ({ active, onComplete }) => {
  const particles = useRef<Particle[]>([]);

  if (particles.current.length === 0) {
    for (let i = 0; i < SHAPE_COUNT; i++) {
      particles.current.push({
        x: new Animated.Value(Math.random() * SCREEN_W),
        y: new Animated.Value(-50),
        rotate: new Animated.Value(0),
        scale: new Animated.Value(0.5 + Math.random() * 0.8),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
      });
    }
  }

  useEffect(() => {
    if (!active) return;

    const animations = particles.current.map((p) => {
      const duration = 2000 + Math.random() * 1500;
      return Animated.parallel([
        Animated.timing(p.y, {
          toValue: 800,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(p.rotate, {
          toValue: 720,
          duration,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.stagger(50, animations).start(() => {
      onComplete?.();
    });

    return () => {
      particles.current.forEach((p) => {
        p.y.setValue(-50);
        p.rotate.setValue(0);
      });
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <View
      style={[styles.container, Platform.OS === 'web' && styles.webPassThrough]}
      pointerEvents={Platform.OS === 'web' ? undefined : 'none'}
    >
      {particles.current.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { rotate: p.rotate.interpolate({ inputRange: [0, 720], outputRange: ['0deg', '720deg'] }) },
                { scale: p.scale },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    overflow: 'hidden',
  },
  webPassThrough: {
    pointerEvents: 'none',
  } as ViewStyle,
  particle: {
    position: 'absolute',
    borderRadius: 4,
  },
});

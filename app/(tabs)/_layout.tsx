/**
 * Layout для табов с Bottom Navigation
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { BottomNav } from '../../components/BottomNav';
import { useAppTheme } from '../../hooks/useAppTheme';

export default function TabsLayout() {
  const palette = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.content}>
        <Slot />
      </View>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

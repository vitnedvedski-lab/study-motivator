import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { UserPlus } from 'lucide-react-native';
import { Child } from '../types';
import { Avatar } from './ui/Avatar';
import { useRouter } from 'expo-router';
import { useAppTheme } from '../hooks/useAppTheme';

interface ChildSelectorProps {
  children: Child[];
  selectedChild: Child | null;
  onSelectChild: (childId: string) => void;
}

export const ChildSelector: React.FC<ChildSelectorProps> = React.memo(({ children, selectedChild, onSelectChild }) => {
  const router = useRouter();
  const palette = useAppTheme();

  if (children.length === 0) {
    return (
      <TouchableOpacity
        style={styles.emptyContainer}
        onPress={() => router.push('/child-new')}
        accessibilityLabel="Добавить ребенка"
        accessibilityRole="button"
      >
        <UserPlus size={24} color={palette.primary} />
        <Text style={[styles.emptyText, { color: palette.primary }]}>Добавить ребенка</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {children.map((child) => {
          const isSelected = child.id === selectedChild?.id;
          return (
            <TouchableOpacity
              key={child.id}
              style={[
                styles.childItem,
                { borderColor: palette.border, backgroundColor: palette.surface },
                isSelected && { borderColor: palette.primary, backgroundColor: palette.primaryContainer },
              ]}
              onPress={() => onSelectChild(child.id)}
              accessibilityLabel={child.name}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
            >
              <Avatar emoji={child.avatarEmoji} color={child.avatarColor} name={child.name} size="small" />
              <Text style={[styles.childName, { color: isSelected ? palette.primary : palette.textSecondary }, isSelected && styles.childNameSelected]}>
                {child.name}
              </Text>
              {isSelected && <View style={[styles.selectedDot, { backgroundColor: palette.primary }]} />}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[styles.addButton, { borderColor: palette.border }]}
          onPress={() => router.push('/child-new')}
          accessibilityLabel="Добавить еще ребенка"
          accessibilityRole="button"
        >
          <UserPlus size={20} color={palette.textTertiary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
});

ChildSelector.displayName = 'ChildSelector';

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  scrollContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  childName: { fontSize: 14, fontWeight: '500' },
  childNameSelected: { fontWeight: '700' },
  selectedDot: { width: 6, height: 6, borderRadius: 3 },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  emptyText: { fontSize: 16, fontWeight: '600' },
});

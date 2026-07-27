import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { BookOpen, Dumbbell, Smile, CheckSquare } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { ActivityType } from '../types';
import { useAppText } from '../hooks/useAppText';
import { useAppTheme } from '../hooks/useAppTheme';

interface CategoryCardProps {
  type: ActivityType;
  points: number;
  count: number;
  onPress?: () => void;
}

const CATEGORY_CONFIG: Record<ActivityType, { color: string; containerKey: 'studyContainer' | 'sportContainer' | 'behaviorContainer' | 'tasksContainer'; icon: any }> = {
  study: { color: Colors.study, containerKey: 'studyContainer', icon: BookOpen },
  sport: { color: Colors.sport, containerKey: 'sportContainer', icon: Dumbbell },
  behavior: { color: Colors.behavior, containerKey: 'behaviorContainer', icon: Smile },
  task: { color: Colors.tasks, containerKey: 'tasksContainer', icon: CheckSquare },
};

export const CategoryCard = React.memo<CategoryCardProps>(({ type, points, count, onPress }) => {
  const config = CATEGORY_CONFIG[type];
  const Icon = config.icon;
  const { text } = useAppText();
  const palette = useAppTheme();
  const label = text.activity[type];

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: palette[config.containerKey] }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`${label}: ${points} ${text.common.points}`}
      accessibilityRole="button"
    >
      <View style={[styles.iconContainer, { backgroundColor: config.color }]}>
        <Icon size={22} color={palette.textInverse} />
      </View>
      <Text style={[styles.label, { color: config.color }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.points, { color: config.color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{points > 0 ? '+' : ''}{points}</Text>
      <Text style={[styles.count, { color: palette.textTertiary }]}>{count}</Text>
    </TouchableOpacity>
  );
});

CategoryCard.displayName = 'CategoryCard';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  points: {
    width: '100%',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  count: {
    fontSize: 11,
  },
});

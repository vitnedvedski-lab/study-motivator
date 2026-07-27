import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Award } from 'lucide-react-native';
import { getLevelConfig, LEVEL_CONFIGS } from '../../constants/levels';
import { useAppTheme } from '../../hooks/useAppTheme';
import { ProgressBar } from './ProgressBar';

interface LevelBadgeProps {
  level: number;
  totalPoints: number;
  showProgress?: boolean;
}

export const LevelBadge = React.memo<LevelBadgeProps>(({
  level,
  totalPoints,
  showProgress = true,
}) => {
  const palette = useAppTheme();
  const config = getLevelConfig(level);
  const nextConfig = LEVEL_CONFIGS.find((item) => item.level === level + 1);
  const currentMin = config.minPoints;
  const nextMin = nextConfig?.minPoints ?? Math.max(currentMin + 100, totalPoints);
  const levelSpan = Math.max(1, nextMin - currentMin);
  const progress = nextConfig ? Math.max(0, Math.min(1, (totalPoints - currentMin) / levelSpan)) : 1;
  const valueLabel = nextConfig ? `${totalPoints} / ${nextMin}` : `${totalPoints}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Award size={20} color={config.color} />
        <Text style={[styles.levelText, { color: config.color }]}>Level {level}</Text>
        <Text style={[styles.nameText, { color: palette.textSecondary }]} numberOfLines={1}>{config.name}</Text>
        <Text style={[styles.pointsText, { color: palette.textPrimary }]}>{valueLabel}</Text>
      </View>
      {showProgress && (
        <ProgressBar
          progress={progress}
          color={config.color}
          height={6}
        />
      )}
    </View>
  );
});

LevelBadge.displayName = 'LevelBadge';

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  nameText: {
    flex: 1,
    fontSize: 14,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '800',
  },
});

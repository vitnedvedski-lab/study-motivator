/**
 * Экран достижений и уровней
 */
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft, Trophy, Flame, Star,
  BookOpen, Dumbbell, ShoppingBag, Lock, Check, Smile
} from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { useAppTheme } from '../hooks/useAppTheme';
import { useChildStore } from '../stores/childStore';
import { AchievementService } from '../services/achievementService';
import { ActivityService } from '../services/activityService';
import { RewardService } from '../services/rewardService';
import { LEVEL_CONFIGS } from '../constants/levels';
import { DEFAULT_ACHIEVEMENTS } from '../constants/achievements';
import { ChildAchievement, Activity, RewardPurchase } from '../types';
import { compareDateStrings, formatDateISO } from '../utils/datePeriod';

const CATEGORY_ICONS: Record<string, any> = {
  points: Star,
  streak: Flame,
  study: BookOpen,
  sport: Dumbbell,
  behavior: Smile,
  shop: ShoppingBag,
};

const CATEGORY_COLORS: Record<string, string> = {
  points: '#FFD700',
  streak: '#FF6B35',
  study: Colors.study,
  sport: Colors.sport,
  behavior: Colors.behavior,
  shop: Colors.primary,
};

export default function AchievementsScreen() {
  const router = useRouter();
  const palette = useAppTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { selectedChild } = useChildStore();
  const child = selectedChild();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [purchases, setPurchases] = useState<RewardPurchase[]>([]);
  const [childAchievements, setChildAchievements] = useState<ChildAchievement[]>([]);

  useEffect(() => {
    if (!child) return;

    const unsubActivities = ActivityService.subscribeToActivities(child.id, setActivities);

    RewardService.getPurchasesByChild(child.id).then(setPurchases);
    AchievementService.getChildAchievements(child.id).then(setChildAchievements);

    return () => {
      unsubActivities();
    };
  }, [child?.id]);

  useEffect(() => {
    if (!child) return;
    AchievementService.checkAchievements(child.id, {
      totalPoints: child.totalPoints,
      currentStreak: child.currentStreak,
      studyActivities: activities.filter((a) => a.type === 'study'),
      sportActivities: activities.filter((a) => a.type === 'sport'),
      behaviorActivities: activities.filter((a) => a.type === 'behavior'),
      purchases,
    }).then((newAch) => {
      if (newAch.length > 0) {
        setChildAchievements((prev) => [...prev, ...newAch]);
      }
    });
  }, [activities, child?.currentStreak, child?.id, child?.totalPoints, purchases]);

  if (!child) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Сначала добавьте ребёнка</Text>
        </View>
      </SafeAreaView>
    );
  }

  const levelConfig = LEVEL_CONFIGS[Math.min(child.currentLevel - 1, LEVEL_CONFIGS.length - 1)];
  const nextLevel = LEVEL_CONFIGS[child.currentLevel];
  const levelProgress = AchievementService.getLevelProgress(child.totalPoints);

  const isUnlocked = (key: string): boolean => {
    return childAchievements.some((ca) => {
      const ach = DEFAULT_ACHIEVEMENTS.find((a) => a.key === key);
      return ach && (ca.achievementId === key || ca.achievementId === ach.key);
    });
  };

  const getProgress = (key: string): number => {
    const ach = DEFAULT_ACHIEVEMENTS.find((a) => a.key === key);
    if (!ach) return 0;

    if (key === 'study_excellent_5') {
      const sortedStudy = activities
        .filter((a) => a.type === 'study' && a.grade !== undefined)
        .sort((a, b) => b.createdAt - a.createdAt);
      let streak = 0;
      for (const activity of sortedStudy) {
        const excellent =
          activity.gradeLabel
            ? ['5', '10', '12', 'A+', 'A'].includes(activity.gradeLabel)
            : (activity.grade ?? 0) >= 90;
        if (!excellent) break;
        streak += 1;
      }
      return Math.min(streak / ach.requirement, 1);
    }

    if (key === 'behavior_no_bad_7') {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - (ach.requirement - 1));
      const startId = formatDateISO(start);
      const todayId = formatDateISO(today);
      const recent = activities.filter(
        (a) => a.type === 'behavior' && compareDateStrings(a.date, startId) >= 0 && compareDateStrings(a.date, todayId) <= 0
      );
      if (recent.some((a) => a.behaviorType === 'bad')) return 0;
      return Math.min(new Set(recent.map((a) => a.date)).size / ach.requirement, 1);
    }

    switch (ach.category) {
      case 'points':
        return Math.min(child.totalPoints / ach.requirement, 1);
      case 'streak':
        return Math.min(child.currentStreak / ach.requirement, 1);
      case 'study':
        return Math.min(activities.filter((a) => a.type === 'study').length / ach.requirement, 1);
      case 'sport':
        return Math.min(activities.filter((a) => a.type === 'sport').length / ach.requirement, 1);
      case 'behavior':
        return Math.min(activities.filter((a) => a.type === 'behavior' && a.behaviorType === 'good').length / ach.requirement, 1);
      case 'shop':
        return Math.min(purchases.length / ach.requirement, 1);
      default:
        return 0;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button
          title=""
          onPress={() => router.back()}
          variant="ghost"
          icon={<ChevronLeft size={24} color={Colors.textPrimary} />}
        />
        <Text style={styles.headerTitle}>Достижения</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Level Card */}
        <Card variant="elevated" style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View style={[styles.levelIcon, { backgroundColor: levelConfig.color + '20' }]}>
              <Trophy size={32} color={levelConfig.color} />
            </View>
            <View style={styles.levelInfo}>
              <Text style={[styles.levelNumber, { color: levelConfig.color }]}>
                Уровень {child.currentLevel}
              </Text>
              <Text style={styles.levelName}>{levelConfig.name}</Text>
            </View>
            <View style={styles.pointsContainer}>
              <Text style={styles.pointsValue}>{child.totalPoints}</Text>
              <Text style={styles.pointsLabel}>баллов</Text>
            </View>
          </View>

          <ProgressBar progress={levelProgress} color={levelConfig.color} height={10} />

          {nextLevel && (
            <Text style={styles.nextLevelText}>
              До уровня {nextLevel.level} — {nextLevel.minPoints - child.totalPoints} баллов
            </Text>
          )}
        </Card>

        {/* Streak Card */}
        <Card style={styles.streakCard}>
          <View style={styles.streakRow}>
            <Flame size={28} color="#FF6B35" />
            <View style={styles.streakInfo}>
              <Text style={styles.streakValue}>{child.currentStreak} дней</Text>
              <Text style={styles.streakLabel}>Текущий стрик</Text>
            </View>
            <View style={styles.streakBest}>
              <Text style={styles.streakBestValue}>{child.longestStreak}</Text>
              <Text style={styles.streakBestLabel}>Лучший</Text>
            </View>
          </View>
        </Card>

        {/* Achievements List */}
        <Text style={styles.sectionTitle}>Достижения</Text>

        <View style={styles.achievementsList}>
          {DEFAULT_ACHIEVEMENTS.map((achievement) => {
            const Icon = CATEGORY_ICONS[achievement.category] ?? Star;
            const unlocked = isUnlocked(achievement.key);
            const progress = getProgress(achievement.key);
            const color = CATEGORY_COLORS[achievement.category] ?? Colors.primary;

            return (
              <Card key={achievement.key} style={[styles.achievementCard, !unlocked && styles.achievementLocked]}>
                <View style={[styles.achievementIcon, { backgroundColor: color + '15' }]}>
                  {unlocked ? (
                    <Icon size={24} color={color} />
                  ) : (
                    <Lock size={20} color={Colors.textTertiary} />
                  )}
                </View>
                <View style={styles.achievementContent}>
                  <Text style={[styles.achievementTitle, !unlocked && styles.achievementTitleLocked]}>
                    {achievement.title}
                  </Text>
                  <Text style={styles.achievementDesc}>{achievement.description}</Text>
                  <ProgressBar
                    progress={progress}
                    color={unlocked ? color : Colors.textTertiary}
                    height={6}
                    style={styles.achievementProgress}
                  />
                  {unlocked && (
                    <View style={styles.unlockedBadge}>
                      <Check size={12} color={Colors.success} />
                      <Text style={styles.unlockedText}>Получено!</Text>
                    </View>
                  )}
                </View>
              </Card>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  levelCard: {
    padding: 20,
    gap: 12,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  levelIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelInfo: {
    flex: 1,
  },
  levelNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  levelName: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  pointsContainer: {
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  pointsLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  nextLevelText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  streakCard: {
    padding: 16,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  streakInfo: {
    flex: 1,
  },
  streakValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF6B35',
  },
  streakLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  streakBest: {
    alignItems: 'center',
  },
  streakBestValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  streakBestLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  achievementsList: {
    gap: 10,
  },
  achievementCard: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
  },
  achievementLocked: {
    opacity: 0.7,
  },
  achievementIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementContent: {
    flex: 1,
    gap: 4,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  achievementTitleLocked: {
    color: Colors.textSecondary,
  },
  achievementDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  achievementProgress: {
    marginTop: 4,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  unlockedText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
});

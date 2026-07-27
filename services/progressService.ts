/**
 * Центральный сервис прогресса ребёнка:
 * - пересчёт стрика по активностям;
 * - проверка и разблокировка достижений (с бонусными баллами);
 * - начисление бонусов за выполненные квесты.
 */
import './firebase';
import { Activity, Child, RewardPurchase } from '../types';
import { ChildService } from './childService';
import { AchievementService } from './achievementService';
import { QUEST_PERIOD_BONUS } from '../constants/dailyQuests';
import { getLevelByPoints } from '../constants/levels';
import { computeCurrentStreak } from '../utils/streak';
import { filterActivitiesByWindow, getAgeGroup, getQuestsForPeriod, getQuestWindow } from '../utils/quests';

const QUEST_PERIODS = ['daily', 'weekly', 'monthly'] as const;

/**
 * Посчитать, какие бонусы за квесты уже можно начислить.
 * Ключ маркера: `${questId}@${windowStart}` или `period:${period}@${windowStart}`.
 */
const computeQuestAwards = (
  child: Child,
  activities: Activity[]
): { markers: Record<string, number>; bonusPoints: number } => {
  const awarded = child.questBonuses ?? {};
  const markers: Record<string, number> = {};
  let bonusPoints = 0;
  const ageGroup = getAgeGroup(child.birthDate);

  for (const period of QUEST_PERIODS) {
    const { start, end } = getQuestWindow(period);
    const windowActivities = filterActivitiesByWindow(activities, start, end);
    const quests = getQuestsForPeriod(period, ageGroup);

    let allDone = quests.length > 0;
    for (const quest of quests) {
      const done = quest.getProgress(windowActivities) >= quest.target;
      if (!done) {
        allDone = false;
        continue;
      }
      const key = `${quest.id}@${start}`;
      if (!awarded[key]) {
        markers[key] = Date.now();
        bonusPoints += quest.pointsReward;
      }
    }

    if (allDone) {
      const key = `period:${period}@${start}`;
      if (!awarded[key]) {
        markers[key] = Date.now();
        bonusPoints += QUEST_PERIOD_BONUS[period];
      }
    }
  }

  return { markers, bonusPoints };
};

export class ProgressService {
  /**
   * Синхронизировать прогресс ребёнка после изменения активностей.
   * Идемпотентно: повторные вызовы без изменений ничего не пишут.
   */
  static async syncChildProgress(child: Child, activities: Activity[], purchases: RewardPurchase[]): Promise<void> {
    const updates: Partial<Child> = {};

    // 1. Стрик
    const streak = computeCurrentStreak(activities);
    if (streak !== (child.currentStreak ?? 0)) {
      updates.currentStreak = streak;
      updates.longestStreak = Math.max(child.longestStreak ?? 0, streak);
    }

    // 2. Бонусы за квесты
    const { markers, bonusPoints } = computeQuestAwards(child, activities);
    if (Object.keys(markers).length > 0) {
      updates.questBonuses = { ...(child.questBonuses ?? {}), ...markers };
      if (bonusPoints > 0) {
        const totalPoints = (child.totalPoints ?? 0) + bonusPoints;
        updates.totalPoints = totalPoints;
        updates.availablePoints = (child.availablePoints ?? 0) + bonusPoints;
        updates.currentLevel = getLevelByPoints(totalPoints);
      }
    }

    if (Object.keys(updates).length > 0) {
      await ChildService.updateChild(child.id, updates);
    }

    // 3. Достижения (бонусные баллы начисляются внутри сервиса)
    await AchievementService.checkAchievements(child.id, {
      totalPoints: updates.totalPoints ?? child.totalPoints ?? 0,
      currentStreak: updates.currentStreak ?? child.currentStreak ?? 0,
      studyActivities: activities.filter((activity) => activity.type === 'study'),
      sportActivities: activities.filter((activity) => activity.type === 'sport'),
      behaviorActivities: activities.filter((activity) => activity.type === 'behavior'),
      purchases,
    });
  }
}

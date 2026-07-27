/**
 * Сервис для работы с достижениями
 */
import './firebase';
import firestore from '@react-native-firebase/firestore';
import { Achievement, ChildAchievement, Activity, RewardPurchase } from '../types';
import { DEFAULT_ACHIEVEMENTS } from '../constants/achievements';
import { LEVEL_CONFIGS, getLevelByPoints } from '../constants/levels';
import { compareDateStrings, formatDateISO } from '../utils/datePeriod';

const ACHIEVEMENTS_COLLECTION = 'achievements';
const CHILD_ACHIEVEMENTS_COLLECTION = 'childAchievements';

export class AchievementService {
  /**
   * Инициализировать достижения (вызывается при первом запуске)
   */
  static async initializeAchievements(): Promise<void> {
    const existing = await firestore().collection(ACHIEVEMENTS_COLLECTION).get();
    if (!existing || !existing.empty) return;

    const batch = firestore().batch();
    DEFAULT_ACHIEVEMENTS.forEach((ach) => {
      const ref = firestore().collection(ACHIEVEMENTS_COLLECTION).doc(ach.key);
      batch.set(ref, { ...ach, id: ach.key });
    });
    await batch.commit();
  }

  /**
   * Получить все достижения
   */
  static async getAllAchievements(): Promise<Achievement[]> {
    const snapshot = await firestore().collection(ACHIEVEMENTS_COLLECTION).get();
    return (snapshot?.docs ?? []).map((doc) => doc.data() as Achievement);
  }

  /**
   * Получить достижения ребёнка
   */
  static async getChildAchievements(childId: string): Promise<ChildAchievement[]> {
    const snapshot = await firestore()
      .collection(CHILD_ACHIEVEMENTS_COLLECTION)
      .where('childId', '==', childId)
      .get();

    return (snapshot?.docs ?? []).map((doc) => doc.data() as ChildAchievement);
  }

  /**
   * Проверить и разблокировать достижения
   */
  static async checkAchievements(
    childId: string,
    stats: {
      totalPoints: number;
      currentStreak: number;
      studyActivities: Activity[];
      sportActivities: Activity[];
      behaviorActivities?: Activity[];
      purchases: RewardPurchase[];
    }
  ): Promise<ChildAchievement[]> {
    const achievements = await this.getAllAchievements();
    const existing = await this.getChildAchievements(childId);
    const existingKeys = new Set(existing.map((a) => a.achievementId));

    const newAchievements: ChildAchievement[] = [];
    let bonusTotal = 0;

    for (const ach of achievements) {
      if (existingKeys.has(ach.id)) continue;

      const unlocked = this.checkRequirement(ach, stats);
      if (unlocked) {
        const ref = firestore().collection(CHILD_ACHIEVEMENTS_COLLECTION).doc();
        const childAch: ChildAchievement = {
          id: ref.id,
          childId,
          achievementId: ach.id,
          unlockedAt: Date.now(),
          progress: ach.requirement,
        };
        await ref.set(childAch);
        newAchievements.push(childAch);
        bonusTotal += ach.bonusPoints ?? 0;
      }
    }

    if (bonusTotal > 0) {
      await this.awardBonusPoints(childId, bonusTotal);
    }

    return newAchievements;
  }

  /**
   * Начислить бонусные баллы за достижения (в totalPoints и availablePoints).
   */
  private static async awardBonusPoints(childId: string, bonusPoints: number): Promise<void> {
    const docRef = firestore().collection('children').doc(childId);
    await firestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);
      const data = snapshot.data();
      if (!data) return;
      const totalPoints = (data.totalPoints ?? 0) + bonusPoints;
      transaction.update(docRef, {
        totalPoints,
        availablePoints: (data.availablePoints ?? 0) + bonusPoints,
        currentLevel: getLevelByPoints(totalPoints),
        updatedAt: Date.now(),
      });
    });
  }

  /**
   * Рассчитать уровень по баллам
   */
  static calculateLevel(totalPoints: number): number {
    return getLevelByPoints(totalPoints);
  }

  /**
   * Прогресс до следующего уровня (0-1)
   */
  static getLevelProgress(totalPoints: number): number {
    const currentLevel = getLevelByPoints(totalPoints);
    const currentConfig = LEVEL_CONFIGS[currentLevel - 1];
    const nextConfig = LEVEL_CONFIGS[currentLevel];

    if (!nextConfig) return 1; // Максимальный уровень

    const range = nextConfig.minPoints - currentConfig.minPoints;
    const progress = totalPoints - currentConfig.minPoints;
    return Math.min(1, Math.max(0, progress / range));
  }

  private static checkRequirement(
    achievement: Achievement,
    stats: {
      totalPoints: number;
      currentStreak: number;
      studyActivities: Activity[];
      sportActivities: Activity[];
      behaviorActivities?: Activity[];
      purchases: RewardPurchase[];
    }
  ): boolean {
    if (achievement.key === 'study_excellent_5') {
      return this.getExcellentStudyStreak(stats.studyActivities) >= achievement.requirement;
    }

    if (achievement.key === 'behavior_no_bad_7') {
      return this.hasNoBadBehaviorForDays(stats.behaviorActivities ?? [], achievement.requirement);
    }

    switch (achievement.category) {
      case 'points':
        return stats.totalPoints >= achievement.requirement;
      case 'streak':
        return stats.currentStreak >= achievement.requirement;
      case 'study':
        return stats.studyActivities.length >= achievement.requirement;
      case 'sport':
        return stats.sportActivities.length >= achievement.requirement;
      case 'behavior':
        return (stats.behaviorActivities ?? []).filter((activity) => activity.behaviorType === 'good').length >= achievement.requirement;
      case 'shop':
        return stats.purchases.length >= achievement.requirement;
      default:
        return false;
    }
  }

  private static getExcellentStudyStreak(activities: Activity[]): number {
    const sorted = [...activities]
      .filter((activity) => activity.grade !== undefined)
      .sort((a, b) => b.createdAt - a.createdAt);

    let streak = 0;
    for (const activity of sorted) {
      if (this.isExcellentGrade(activity)) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  }

  private static isExcellentGrade(activity: Activity): boolean {
    if (activity.gradeLabel) {
      return ['5', '10', '12', 'A+', 'A'].includes(activity.gradeLabel);
    }

    return (activity.grade ?? 0) >= 90;
  }

  private static hasNoBadBehaviorForDays(activities: Activity[], days: number): boolean {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (days - 1));
    const startId = formatDateISO(start);
    const todayId = formatDateISO(today);

    const recentActivities = activities.filter(
      (activity) => compareDateStrings(activity.date, startId) >= 0 && compareDateStrings(activity.date, todayId) <= 0
    );
    const activeDates = new Set(recentActivities.map((activity) => activity.date));
    if (activeDates.size < days) return false;

    return !recentActivities.some((activity) => {
      return (
        activity.behaviorType === 'bad'
      );
    });
  }
}

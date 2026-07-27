/**
 * Сервис для работы с активностями в Firestore
 */
import './firebase';
import firestore from '@react-native-firebase/firestore';
import { Activity, ActivityType, Cabinet } from '../types';
import { calculateStudyPoints } from '../utils/gradeScoring';
import { compareDateStrings } from '../utils/datePeriod';

const ACTIVITIES_COLLECTION = 'activities';

export class ActivityService {
  /**
   * Добавить активность
   */
  static async addActivity(data: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity> {
    const docRef = firestore().collection(ACTIVITIES_COLLECTION).doc();
    const activity: Activity = {
      ...data,
      id: docRef.id,
      createdAt: Date.now(),
    };
    await docRef.set(activity);
    return activity;
  }

  /**
   * Получить активности ребёнка
   */
  static async getActivitiesByChild(
    childId: string,
    options?: { type?: ActivityType; limit?: number; fromDate?: string; toDate?: string }
  ): Promise<Activity[]> {
    let query = firestore()
      .collection(ACTIVITIES_COLLECTION)
      .where('childId', '==', childId);

    if (options?.type) {
      query = query.where('type', '==', options.type);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    let activities = (snapshot?.docs ?? [])
      .map((doc) => doc.data() as Activity)
      .sort((a, b) => b.createdAt - a.createdAt);

    // Фильтрация по дате на клиенте (Firestore не поддерживает составные запросы с разными полями)
    if (options?.fromDate) {
      activities = activities.filter((a) => compareDateStrings(a.date, options.fromDate!) >= 0);
    }
    if (options?.toDate) {
      activities = activities.filter((a) => compareDateStrings(a.date, options.toDate!) <= 0);
    }

    return activities;
  }

  /**
   * Удалить активность
   */
  static async deleteActivity(id: string): Promise<void> {
    await firestore().collection(ACTIVITIES_COLLECTION).doc(id).delete();
  }

  static async updateActivity(id: string, updates: Partial<Activity>): Promise<void> {
    await firestore().collection(ACTIVITIES_COLLECTION).doc(id).update(updates);
  }

  /**
   * Подписка на активности ребёнка
   */
  static subscribeToActivities(childId: string, callback: (activities: Activity[]) => void) {
    return firestore()
      .collection(ACTIVITIES_COLLECTION)
      .where('childId', '==', childId)
      .onSnapshot((snapshot) => {
        if (!snapshot) {
          callback([]);
          return;
        }
        const activities = (snapshot?.docs ?? [])
          .map((doc) => doc.data() as Activity)
          .sort((a, b) => b.createdAt - a.createdAt);
        callback(activities);
      }, (error) => {
        console.error('Activities subscription error:', error);
        callback([]);
      });
  }

  /**
   * Рассчитать баллы за активность
   */
  static calculatePoints(activity: Partial<Activity>, cabinet?: Cabinet | null): number {
    switch (activity.type) {
      case 'study':
        return calculateStudyPoints(
          activity.grade ?? 0,
          cabinet?.gradeSystem ?? '5',
          activity.subjectCategory ?? 'C',
          cabinet?.categoryWeights
        );
      case 'sport':
        if (typeof activity.points === 'number') return activity.points;
        return this.calculateSportPoints(activity.sportMinutes ?? 0);
      case 'behavior':
        if (typeof activity.points === 'number') return activity.points;
        return activity.behaviorType === 'good' ? 5 : -5;
      case 'task':
        if (typeof activity.points === 'number') return activity.points;
        return activity.taskCompleted ? 5 : 0;
      default:
        return 0;
    }
  }

  private static calculateSportPoints(minutes: number): number {
    if (minutes >= 90) return 5;
    if (minutes >= 30) return 3;
    if (minutes > 0) return 1;
    return 0;
  }
}

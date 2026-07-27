/**
 * Сервис для статистики
 */
import { Activity, DailyStats, CategoryBreakdown, ActivityType } from '../types';
import { format, parseISO, eachDayOfInterval, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatDateDisplay, formatDateId, parseISODate } from '../utils/datePeriod';

export class StatsService {
  /**
   * Дневная статистика за период
   */
  static getDailyStats(activities: Activity[], days: number): DailyStats[] {
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    // Группируем активности по дате
    const activityMap = new Map<string, Activity[]>();
    activities.forEach((activity) => {
      const existing = activityMap.get(activity.date) ?? [];
      existing.push(activity);
      activityMap.set(activity.date, existing);
    });

    return dateRange.map((date) => {
      const dateStr = formatDateDisplay(date);
      const oldDateStr = formatDateId(date);
      const dayActivities = [...(activityMap.get(dateStr) ?? []), ...(activityMap.get(oldDateStr) ?? [])];

      const studyPoints = this.sumByType(dayActivities, 'study');
      const sportPoints = this.sumByType(dayActivities, 'sport');
      const behaviorPoints = this.sumByType(dayActivities, 'behavior');
      const taskPoints = this.sumByType(dayActivities, 'task');

      return {
        date: dateStr,
        studyPoints,
        sportPoints,
        behaviorPoints,
        taskPoints,
        totalPoints: studyPoints + sportPoints + behaviorPoints + taskPoints,
      };
    });
  }

  /**
   * Распределение по категориям
   */
  static getCategoryBreakdown(activities: Activity[]): CategoryBreakdown[] {
    const totals: Record<ActivityType, number> = {
      study: 0,
      sport: 0,
      behavior: 0,
      task: 0,
    };

    activities.forEach((a) => {
      if (totals[a.type] !== undefined) {
        totals[a.type] += a.points;
      }
    });

    // Отрицательные суммы по категории не даём уйти процентам в минус:
    // распределение считаем по положительному вкладу категорий.
    const positiveTotals = Object.fromEntries(
      Object.entries(totals).map(([key, value]) => [key, Math.max(0, value)])
    ) as Record<ActivityType, number>;

    const total = Object.values(positiveTotals).reduce((sum, v) => sum + v, 0);
    if (total === 0) return [];

    return (Object.entries(positiveTotals) as [ActivityType, number][]).map(([category, points]) => ({
      category,
      points,
      percentage: Math.round((points / total) * 100),
    }));
  }

  /**
   * Общая статистика
   */
  static getSummary(activities: Activity[]) {
    const earned = activities
      .filter((a) => a.points > 0)
      .reduce((sum, a) => sum + a.points, 0);

    const spent = activities
      .filter((a) => a.points < 0)
      .reduce((sum, a) => sum + Math.abs(a.points), 0);

    const dailyTotals = new Map<string, number>();
    activities.forEach((a) => {
      const current = dailyTotals.get(a.date) ?? 0;
      dailyTotals.set(a.date, current + a.points);
    });

    let bestDay = { date: '', points: 0 };
    dailyTotals.forEach((points, date) => {
      if (points > bestDay.points) {
        bestDay = { date, points };
      }
    });

    const uniqueDays = dailyTotals.size;

    return {
      totalEarned: earned,
      totalSpent: spent,
      averagePerDay: uniqueDays > 0 ? Math.round(earned / uniqueDays) : 0,
      bestDay,
      totalActivities: activities.length,
    };
  }

  /**
   * Форматировать дату
   */
  static formatDate(dateStr: string, formatStr: string = 'dd-MM-yyyy'): string {
    try {
      const parsed = parseISODate(dateStr);
      return format(parsed ?? parseISO(dateStr), formatStr, { locale: ru });
    } catch {
      return dateStr;
    }
  }

  private static sumByType(activities: Activity[], type: ActivityType): number {
    return activities
      .filter((a) => a.type === type)
      .reduce((sum, a) => sum + a.points, 0);
  }
}

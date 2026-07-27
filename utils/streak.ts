import { Activity } from '../types';
import { formatDateISO, shiftDateString } from './datePeriod';

/**
 * Текущий стрик: количество подряд идущих дней с хотя бы одной
 * активностью с положительными баллами.
 * Стрик считается от сегодня; если сегодня записей ещё нет,
 * стрик не обрывается — считаем от вчера.
 */
export const computeCurrentStreak = (activities: Activity[], today: Date = new Date()): number => {
  const activeDates = new Set(
    activities.filter((activity) => activity.points > 0).map((activity) => activity.date)
  );
  if (activeDates.size === 0) return 0;

  let cursor = formatDateISO(today);
  // Сегодня ещё нет активности — начинаем проверку со вчерашнего дня.
  if (!activeDates.has(cursor)) {
    cursor = shiftDateString(cursor, -1);
  }
  if (!activeDates.has(cursor)) return 0;

  let streak = 0;
  while (activeDates.has(cursor)) {
    streak += 1;
    cursor = shiftDateString(cursor, -1);
  }
  return streak;
};

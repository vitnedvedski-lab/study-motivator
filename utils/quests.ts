import { Activity } from '../types';
import { QUESTS, Quest, QuestPeriod } from '../constants/dailyQuests';
import { compareDateStrings, formatDateISO, parseISODate, shiftDateString } from './datePeriod';

export type AgeGroup = '6-8' | '9-11' | '12-14' | '15-18';

export const getAgeGroup = (birthDate?: string): AgeGroup => {
  const parsed = birthDate ? parseISODate(birthDate) : null;
  if (!parsed) return '9-11';
  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const birthdayPassed = now.getMonth() > parsed.getMonth() || (now.getMonth() === parsed.getMonth() && now.getDate() >= parsed.getDate());
  if (!birthdayPassed) age -= 1;
  if (age <= 8) return '6-8';
  if (age <= 11) return '9-11';
  if (age <= 14) return '12-14';
  return '15-18';
};

export const QUEST_PERIOD_DAYS: Record<QuestPeriod, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

/**
 * Окно периода квеста: [start, end] в формате DD-MM-YYYY, end = сегодня.
 */
export const getQuestWindow = (period: QuestPeriod, today: Date = new Date()) => {
  const days = QUEST_PERIOD_DAYS[period];
  const end = formatDateISO(today);
  const start = shiftDateString(end, -(days - 1));
  return { start, end };
};

export const filterActivitiesByWindow = (activities: Activity[], start: string, end: string) =>
  activities.filter(
    (activity) => compareDateStrings(activity.date, start) >= 0 && compareDateStrings(activity.date, end) <= 0
  );

export const getQuestsForPeriod = (period: QuestPeriod, ageGroup: AgeGroup): Quest[] =>
  QUESTS.filter((quest) => quest.period === period && (!quest.ageGroups || quest.ageGroups.includes(ageGroup)));

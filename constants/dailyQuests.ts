import { Activity } from '../types';

export type QuestPeriod = 'daily' | 'weekly' | 'monthly';

export interface Quest {
  id: string;
  period: QuestPeriod;
  ageGroups?: Array<'6-8' | '9-11' | '12-14' | '15-18'>;
  title: string;
  target: number;
  pointsReward: number;
  getProgress: (activities: Activity[]) => number;
}

export const QUESTS: Quest[] = [
  {
    id: 'daily_two_grades',
    period: 'daily',
    title: 'Добавить 2 оценки',
    target: 2,
    pointsReward: 5,
    getProgress: (activities) => activities.filter((activity) => activity.type === 'study').length,
  },
  {
    id: 'daily_sport',
    period: 'daily',
    title: 'Отметить спорт',
    target: 1,
    pointsReward: 3,
    getProgress: (activities) => activities.filter((activity) => activity.type === 'sport').length,
  },
  {
    id: 'daily_behavior',
    period: 'daily',
    title: 'Записать поведение',
    target: 1,
    pointsReward: 3,
    getProgress: (activities) => activities.filter((activity) => activity.type === 'behavior').length,
  },
  {
    id: 'weekly_ten_grades',
    period: 'weekly',
    title: '10 учебных записей за неделю',
    target: 10,
    pointsReward: 20,
    getProgress: (activities) => activities.filter((activity) => activity.type === 'study').length,
  },
  {
    id: 'weekly_three_tasks',
    period: 'weekly',
    title: 'Выполнить 3 задания',
    target: 3,
    pointsReward: 15,
    getProgress: (activities) => activities.filter((activity) => activity.type === 'task' && activity.taskCompleted).length,
  },
  {
    id: 'weekly_positive_behavior',
    period: 'weekly',
    title: '5 хороших поступков',
    target: 5,
    pointsReward: 15,
    getProgress: (activities) => activities.filter((activity) => activity.type === 'behavior' && activity.points > 0).length,
  },
  {
    id: 'monthly_study_rhythm',
    period: 'monthly',
    title: '30 учебных записей за месяц',
    target: 30,
    pointsReward: 60,
    getProgress: (activities) => activities.filter((activity) => activity.type === 'study').length,
  },
  {
    id: 'monthly_all_rounder',
    period: 'monthly',
    title: 'Учёба, спорт и задания',
    target: 3,
    pointsReward: 50,
    getProgress: (activities) => {
      const hasStudy = activities.some((activity) => activity.type === 'study');
      const hasSport = activities.some((activity) => activity.type === 'sport');
      const hasTask = activities.some((activity) => activity.type === 'task');
      return [hasStudy, hasSport, hasTask].filter(Boolean).length;
    },
  },
  {
    id: 'age_6_8_first_lesson',
    period: 'daily',
    ageGroups: ['6-8'],
    title: 'Маленький учебный старт',
    target: 1,
    pointsReward: 3,
    getProgress: (activities) => activities.filter((activity) => activity.type === 'study').length,
  },
  {
    id: 'age_9_11_subject_balance',
    period: 'weekly',
    ageGroups: ['9-11'],
    title: 'Разные предметы за неделю',
    target: 3,
    pointsReward: 12,
    getProgress: (activities) => new Set(activities.filter((activity) => activity.type === 'study').map((activity) => activity.subjectId ?? activity.subjectName)).size,
  },
  {
    id: 'age_12_14_independent_tasks',
    period: 'weekly',
    ageGroups: ['12-14'],
    title: 'Самостоятельные задания',
    target: 4,
    pointsReward: 18,
    getProgress: (activities) => activities.filter((activity) => activity.type === 'task' && activity.taskCompleted).length,
  },
  {
    id: 'age_15_18_study_rhythm',
    period: 'monthly',
    ageGroups: ['15-18'],
    title: 'Стабильный учебный ритм',
    target: 40,
    pointsReward: 80,
    getProgress: (activities) => activities.filter((activity) => activity.type === 'study').length,
  },
];

export const QUEST_PERIOD_BONUS: Record<QuestPeriod, number> = {
  daily: 10,
  weekly: 30,
  monthly: 75,
};

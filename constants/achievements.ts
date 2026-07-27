import { Achievement } from '../types';

export const DEFAULT_ACHIEVEMENTS: Omit<Achievement, 'id'>[] = [
  { key: 'points_10', title: '🎯 Первые шаги', description: 'Набери 10 баллов', icon: 'target', requirement: 10, category: 'points', bonusPoints: 5 },
  { key: 'points_50', title: '💰 Собиратель', description: 'Набери 50 баллов', icon: 'coins', requirement: 50, category: 'points', bonusPoints: 10 },
  { key: 'points_100', title: '💎 Богач', description: 'Набери 100 баллов', icon: 'gem', requirement: 100, category: 'points', bonusPoints: 20 },
  { key: 'points_500', title: '👑 Миллионер', description: 'Набери 500 баллов', icon: 'crown', requirement: 500, category: 'points', bonusPoints: 50 },

  { key: 'study_1', title: '📚 Отличник', description: 'Получи первую оценку', icon: 'book-open', requirement: 1, category: 'study', bonusPoints: 5 },
  { key: 'study_10', title: '📖 Прилежный', description: 'Получи 10 оценок', icon: 'book', requirement: 10, category: 'study', bonusPoints: 15 },
  { key: 'study_50', title: '🧠 Зубр', description: 'Получи 50 оценок', icon: 'brain', requirement: 50, category: 'study', bonusPoints: 30 },
  { key: 'study_excellent_5', title: '⭐ Пятёрочник', description: '5 отличных оценок подряд', icon: 'star', requirement: 5, category: 'study', bonusPoints: 25 },

  { key: 'sport_5', title: '🏃 Спортсмен', description: 'Отметь 5 тренировок', icon: 'dumbbell', requirement: 5, category: 'sport', bonusPoints: 10 },
  { key: 'sport_20', title: '💪 Атлет', description: 'Отметь 20 тренировок', icon: 'activity', requirement: 20, category: 'sport', bonusPoints: 25 },

  { key: 'behavior_5', title: '👍 Молодец', description: '5 хороших поступков', icon: 'thumbs-up', requirement: 5, category: 'behavior', bonusPoints: 10 },
  { key: 'behavior_20', title: '🌟 Образцовый', description: '20 хороших поступков', icon: 'sparkles', requirement: 20, category: 'behavior', bonusPoints: 25 },
  { key: 'behavior_no_bad_7', title: '😇 Ангел', description: '7 дней без плохого поведения', icon: 'smile', requirement: 7, category: 'behavior', bonusPoints: 30 },

  { key: 'streak_3', title: '🔥 На волне', description: 'Стрик 3 дня', icon: 'flame', requirement: 3, category: 'streak', bonusPoints: 10 },
  { key: 'streak_7', title: '⚡ Непрерывный', description: 'Стрик 7 дней', icon: 'zap', requirement: 7, category: 'streak', bonusPoints: 25 },
  { key: 'streak_30', title: '🏆 Легенда', description: 'Стрик 30 дней', icon: 'trophy', requirement: 30, category: 'streak', bonusPoints: 100 },
];

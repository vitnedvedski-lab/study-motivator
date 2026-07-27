import { LevelConfig } from '../types';

export const LEVEL_CONFIGS: LevelConfig[] = [
  { level: 1, name: '⭐ Новичок', minPoints: 0, color: '#CD7F32' },
  { level: 2, name: '📖 Ученик', minPoints: 51, color: '#B8860B' },
  { level: 3, name: '🧠 Знаток', minPoints: 151, color: '#4A6FA5' },
  { level: 4, name: '🎓 Эксперт', minPoints: 301, color: '#48A16B' },
  { level: 5, name: '👑 Мастер', minPoints: 501, color: '#E8A010' },
  { level: 6, name: '🔬 Гений', minPoints: 751, color: '#2D9CDB' },
  { level: 7, name: '🏆 Легенда', minPoints: 1001, color: '#FFD700' },
  { level: 8, name: '🦸 Супергерой', minPoints: 1501, color: '#7B6DB5' },
  { level: 9, name: '🚀 Космонавт', minPoints: 2501, color: '#D4883A' },
  { level: 10, name: '🌌 Вселенский разум', minPoints: 5001, color: '#D44040' },
];

export const getLevelConfig = (level: number): LevelConfig => {
  return LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)] ?? LEVEL_CONFIGS[0];
};

export const getLevelByPoints = (points: number): number => {
  for (let i = LEVEL_CONFIGS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_CONFIGS[i].minPoints) {
      return LEVEL_CONFIGS[i].level;
    }
  }
  return 1;
};

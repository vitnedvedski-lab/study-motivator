/**
 * Цветовая палитра "Тёплый Янтарь"
 */
export const Colors = {
  // Основные
  primary: '#E8A010',
  primaryContainer: '#FFF3E0',
  primaryDark: '#C48400',
  primaryLight: '#FFD54F',

  // Вторичные
  secondary: '#D4883A',
  secondaryContainer: '#FBE9D0',

  // Фон
  background: '#FAFAF5',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F0EB',

  // Текст
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6560',
  textTertiary: '#9E9893',
  textInverse: '#FFFFFF',

  // Границы
  border: '#E8E2DC',
  divider: '#F0EBE5',

  // Состояния
  success: '#48A16B',
  successContainer: '#E8F5E9',
  danger: '#D44040',
  dangerContainer: '#FFEBEE',
  warning: '#E8A010',
  info: '#4A6FA5',

  // Категории
  study: '#4A6FA5',
  studyContainer: '#E8EEF5',
  sport: '#48A16B',
  sportContainer: '#E8F5E9',
  behavior: '#7B6DB5',
  behaviorContainer: '#EDE7F6',
  tasks: '#D4883A',
  tasksContainer: '#FFF3E0',

  // Уровни
  levelBronze: '#CD7F32',
  levelSilver: '#C0C0C0',
  levelGold: '#FFD700',
  levelPlatinum: '#4A6FA5',
  levelDiamond: '#7B6DB5',

  // Тёмная тема
  darkBackground: '#1A1A1A',
  darkSurface: '#2D2D2D',
  darkSurfaceVariant: '#3D3D3D',
  darkTextPrimary: '#F5F5F5',
  darkTextSecondary: '#B0B0B0',
  darkBorder: '#3D3D3D',
} as const;

export type ColorKey = keyof typeof Colors;

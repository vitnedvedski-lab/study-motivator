import { useColorScheme } from 'react-native';
import { Colors } from '../constants/colors';
import { useUIStore } from '../stores/uiStore';

export type AppPalette = ReturnType<typeof buildPalette>;

const buildPalette = (dark: boolean) => ({
  isDark: dark,
  primary: Colors.primary,
  primaryContainer: dark ? '#3A2B0D' : Colors.primaryContainer,
  secondary: Colors.secondary,
  background: dark ? Colors.darkBackground : Colors.background,
  surface: dark ? Colors.darkSurface : Colors.surface,
  surfaceVariant: dark ? Colors.darkSurfaceVariant : Colors.surfaceVariant,
  textPrimary: dark ? Colors.darkTextPrimary : Colors.textPrimary,
  textSecondary: dark ? Colors.darkTextSecondary : Colors.textSecondary,
  textTertiary: dark ? '#8F8F8F' : Colors.textTertiary,
  textInverse: Colors.textInverse,
  border: dark ? Colors.darkBorder : Colors.border,
  divider: dark ? Colors.darkBorder : Colors.divider,
  success: Colors.success,
  successContainer: dark ? '#183728' : Colors.successContainer,
  danger: Colors.danger,
  dangerContainer: dark ? '#3B1717' : Colors.dangerContainer,
  warning: Colors.warning,
  info: Colors.info,
  study: Colors.study,
  studyContainer: dark ? '#172536' : Colors.studyContainer,
  sport: Colors.sport,
  sportContainer: dark ? '#173324' : Colors.sportContainer,
  behavior: Colors.behavior,
  behaviorContainer: dark ? '#282238' : Colors.behaviorContainer,
  tasks: Colors.tasks,
  tasksContainer: dark ? '#382515' : Colors.tasksContainer,
  paper: dark ? '#25221D' : '#FFFDF7',
  paperLine: dark ? '#51493F' : '#E2D4BC',
});

export const useAppTheme = () => {
  const systemTheme = useColorScheme();
  const theme = useUIStore((state) => state.settings.theme);
  const dark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
  return buildPalette(dark);
};

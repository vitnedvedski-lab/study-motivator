import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { BarChart3, BookOpen, Clock, Home, PlusCircle, ShoppingBag } from 'lucide-react-native';
import { usePathname, useRouter } from 'expo-router';
import { blurActiveElementOnWeb } from '../utils/webFocus';
import { useAppText } from '../hooks/useAppText';
import { useAppTheme } from '../hooks/useAppTheme';
import { useUIStore } from '../stores/uiStore';

const TABS = [
  { key: '/', labelKey: 'home', icon: Home },
  { key: '/diary', labelKey: 'diary', icon: BookOpen },
  { key: '/add', labelKey: 'add', icon: PlusCircle, parentOnly: true },
  { key: '/shop', labelKey: 'shop', icon: ShoppingBag },
  { key: '/history', labelKey: 'history', icon: Clock },
  { key: '/stats', labelKey: 'stats', icon: BarChart3 },
] as const;

export const BottomNav: React.FC = React.memo(() => {
  const pathname = usePathname();
  const router = useRouter();
  const palette = useAppTheme();
  const { text } = useAppText();
  const isChildMode = useUIStore((state) => state.settings.accessMode === 'child');

  const handleTabPress = (path: string) => {
    blurActiveElementOnWeb();
    // navigate, а не push: не раздуваем стек вкладками, «назад» работает предсказуемо.
    router.navigate(path as any);
  };

  // В детском режиме вкладка добавления скрыта.
  const visibleTabs = TABS.filter((tab) => !('parentOnly' in tab && tab.parentOnly && isChildMode));

  return (
    <View style={[styles.container, { backgroundColor: palette.surface, borderTopColor: palette.divider }]}>
      {visibleTabs.map((tab) => {
        const isActive = pathname === tab.key || (tab.key !== '/' && pathname.startsWith(tab.key));
        const Icon = tab.icon;
        const label = text.nav[tab.labelKey];
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => handleTabPress(tab.key)}
            accessibilityLabel={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Icon size={22} color={isActive ? palette.primary : palette.textTertiary} strokeWidth={isActive ? 2.5 : 1.5} />
            <Text style={[styles.label, { color: isActive ? palette.primary : palette.textTertiary }, isActive && styles.labelActive]} numberOfLines={1}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

BottomNav.displayName = 'BottomNav';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 18,
    paddingTop: 8,
    ...Platform.select({
      web: { boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)' } as ViewStyle,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    minWidth: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
  labelActive: {
    fontWeight: '700',
  },
});

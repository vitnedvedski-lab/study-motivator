/**
 * Корневой layout приложения
 * Проверяет авторизацию и перенаправляет на нужный экран
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { AuthService } from '../services/authService';
import { ChildService } from '../services/childService';
import { CabinetService } from '../services/cabinetService';
import { ActivityService } from '../services/activityService';
import { RewardService } from '../services/rewardService';
import { ProgressService } from '../services/progressService';
import { useAuthStore } from '../stores/authStore';
import { useChildStore } from '../stores/childStore';
import { useCabinetStore } from '../stores/cabinetStore';
import { useUIStore } from '../stores/uiStore';
import { Colors } from '../constants/colors';
import { blurActiveElementOnWeb } from '../utils/webFocus';
import i18n from '../locales/i18n';
import { Confetti } from '../components/ui/Confetti';
import { Activity, AppSettings, RewardPurchase } from '../types';
import { getLocalizedSubjectName } from '../utils/subjects';

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    secondary: Colors.secondary,
    background: Colors.background,
    surface: Colors.surface,
    error: Colors.danger,
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.primary,
    secondary: Colors.secondary,
    background: Colors.darkBackground,
    surface: Colors.darkSurface,
    error: Colors.danger,
  },
};

const PRAISE_SEEN_PREFIX = '@study_motivator_seen_praise:';

const PRAISE_TEMPLATES: Partial<Record<AppSettings['language'], string[]>> = {
  ru: [
    'Класс! Ты получил {{points}} баллов за {{reason}}.',
    'Отличный результат: {{points}} баллов за {{reason}}.',
    'Так держать! В копилку прогресса прилетело {{points}} баллов за {{reason}}.',
    'Вот это ход! {{points}} баллов за {{reason}}.',
    'Супер, твой прогресс вырос на {{points}} баллов за {{reason}}.',
    'Ещё один шаг вперёд: {{points}} баллов за {{reason}}.',
    'Здорово получилось! {{points}} баллов за {{reason}}.',
    'Ты молодец: {{points}} баллов за {{reason}}.',
    'Результат засчитан: {{points}} баллов за {{reason}}.',
    'Вау, новая победа! {{points}} баллов за {{reason}}.',
  ],
  en: [
    'Nice! You earned {{points}} points for {{reason}}.',
    'Great result: {{points}} points for {{reason}}.',
    'Keep going! {{points}} points landed in your progress for {{reason}}.',
    'Strong move! {{points}} points for {{reason}}.',
    'Super, your progress grew by {{points}} points for {{reason}}.',
    'One more step forward: {{points}} points for {{reason}}.',
    'Well done! {{points}} points for {{reason}}.',
    'You did great: {{points}} points for {{reason}}.',
    'Result counted: {{points}} points for {{reason}}.',
    'Wow, a new win! {{points}} points for {{reason}}.',
  ],
  zh: [
    '太棒了！你因{{reason}}获得{{points}}积分。',
    '好成绩：{{reason}}获得{{points}}积分。',
    '继续保持！{{reason}}让进度增加{{points}}积分。',
    '漂亮！{{reason}}获得{{points}}积分。',
    '很棒，进度增加{{points}}积分：{{reason}}。',
    '又前进一步：{{reason}}获得{{points}}积分。',
    '做得好！{{reason}}获得{{points}}积分。',
    '你真棒：{{reason}}获得{{points}}积分。',
    '结果已记录：{{reason}}获得{{points}}积分。',
    '新的胜利！{{reason}}获得{{points}}积分。',
  ],
};

const PRAISE_VARIANTS = [
  { icon: '🎉', accent: Colors.primary },
  { icon: '⭐', accent: Colors.warning },
  { icon: '🏆', accent: Colors.success },
  { icon: '🔥', accent: Colors.danger },
  { icon: '✨', accent: Colors.secondary },
  { icon: '👏', accent: Colors.study },
  { icon: '💫', accent: Colors.primary },
  { icon: '🚀', accent: Colors.success },
  { icon: '🌟', accent: Colors.warning },
  { icon: '💪', accent: Colors.sport },
];

const PRAISE_COPY: Partial<Record<AppSettings['language'], { subject: string; grade: string; sport: string; good: string; bad: string; task: string; result: string; title: string }>> = {
  ru: { subject: 'предмет', grade: 'оценка', sport: 'спорт', good: 'хорошее поведение', bad: 'исправленное поведение', task: 'задание', result: 'результат', title: 'Поздравляем!' },
  en: { subject: 'subject', grade: 'grade', sport: 'sport', good: 'good behavior', bad: 'improved behavior', task: 'task', result: 'result', title: 'Congratulations!' },
  zh: { subject: '科目', grade: '成绩', sport: '运动', good: '良好行为', bad: '改进行为', task: '任务', result: '结果', title: '恭喜！' },
};

const getPraiseReason = (activity: Activity, language: AppSettings['language']) => {
  const copy = PRAISE_COPY[language] ?? PRAISE_COPY.en!;
  switch (activity.type) {
    case 'study':
      return `${getLocalizedSubjectName(activity.subjectName, language) || copy.subject}${activity.gradeLabel || activity.grade ? `, ${copy.grade} ${activity.gradeLabel ?? activity.grade}` : ''}`;
    case 'sport':
      return activity.sportType ?? copy.sport;
    case 'behavior':
      return activity.behaviorType === 'bad' ? copy.bad : copy.good;
    case 'task':
      return activity.taskName ?? copy.task;
    default:
      return copy.result;
  }
};

const buildPraiseMessage = (activity: Activity, language: AppSettings['language']) => {
  const templates = PRAISE_TEMPLATES[language] ?? PRAISE_TEMPLATES.en!;
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template
    .replace('{{points}}', `+${activity.points}`)
    .replace('{{reason}}', getPraiseReason(activity, language));
};

function ChildPraiseWatcher() {
  const { selectedChildId } = useChildStore();
  const { settings } = useUIStore();
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const initializedRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());
  const [activePraise, setActivePraise] = useState<{ message: string; variant: typeof PRAISE_VARIANTS[number] } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const enabled = settings.accessMode === 'child' && settings.notificationsEnabled && Boolean(selectedChildId);

  const storageKey = useMemo(
    () => selectedChildId ? `${PRAISE_SEEN_PREFIX}${selectedChildId}` : '',
    [selectedChildId],
  );

  useEffect(() => {
    initializedRef.current = false;
    seenRef.current = new Set();
  }, [storageKey]);

  useEffect(() => {
    if (!enabled || !selectedChildId || !storageKey) return;
    let mounted = true;

    const loadSeen = async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (mounted) {
          seenRef.current = new Set(raw ? JSON.parse(raw) : []);
        }
      } catch {
        if (mounted) seenRef.current = new Set();
      }
    };

    loadSeen();
    return ActivityService.subscribeToActivities(selectedChildId, async (activities) => {
      if (!mounted) return;
      const positive = activities.filter((activity) => activity.points > 0);

      if (!initializedRef.current) {
        positive.forEach((activity) => seenRef.current.add(activity.id));
        initializedRef.current = true;
        await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(seenRef.current).slice(-80)));
        return;
      }

      const newest = positive
        .filter((activity) => !seenRef.current.has(activity.id))
        .sort((a, b) => b.createdAt - a.createdAt)[0];

      if (!newest) return;
      seenRef.current.add(newest.id);
      await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(seenRef.current).slice(-80)));
      setActivePraise({
        message: buildPraiseMessage(newest, settings.language),
        variant: PRAISE_VARIANTS[Math.floor(Math.random() * PRAISE_VARIANTS.length)],
      });
      setShowConfetti(true);
    });
  }, [enabled, selectedChildId, settings.language, storageKey]);

  useEffect(() => {
    if (!activePraise) return;
    scale.setValue(0.92);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 90 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setActivePraise(null);
      });
    }, 3800);
    return () => clearTimeout(timer);
  }, [activePraise, opacity, scale]);

  if (!activePraise) return null;

  return (
    <View pointerEvents="box-none" style={praiseStyles.root}>
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      <TouchableOpacity activeOpacity={0.92} onPress={() => setActivePraise(null)} style={praiseStyles.touchWrap}>
        <Animated.View
          style={[
            praiseStyles.card,
            {
              borderColor: activePraise.variant.accent,
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <View style={[praiseStyles.iconBubble, { backgroundColor: `${activePraise.variant.accent}22` }]}>
            <Text style={praiseStyles.icon}>{activePraise.variant.icon}</Text>
          </View>
          <View style={praiseStyles.textBlock}>
            <Text style={praiseStyles.title}>{(PRAISE_COPY[settings.language] ?? PRAISE_COPY.en!).title}</Text>
            <Text style={praiseStyles.message}>{activePraise.message}</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Следит за активностями/покупками выбранного ребёнка и синхронизирует
 * стрик, достижения (с бонусами) и бонусы за квесты.
 */
function ChildProgressSyncer() {
  const { selectedChildId } = useChildStore();

  useEffect(() => {
    if (!selectedChildId) return;
    let activities: Activity[] = [];
    let purchases: RewardPurchase[] = [];
    let running = false;
    let queued = false;

    const run = async () => {
      if (running) {
        queued = true;
        return;
      }
      running = true;
      try {
        const child = useChildStore.getState().selectedChild();
        if (child) {
          await ProgressService.syncChildProgress(child, activities, purchases);
        }
      } catch (error) {
        console.error('Progress sync error:', error);
      } finally {
        running = false;
        if (queued) {
          queued = false;
          run();
        }
      }
    };

    const unsubscribeActivities = ActivityService.subscribeToActivities(selectedChildId, (items) => {
      activities = items;
      run();
    });
    const unsubscribePurchases = RewardService.subscribeToPurchases(selectedChildId, (items) => {
      purchases = items;
      run();
    });

    return () => {
      unsubscribeActivities();
      unsubscribePurchases();
    };
  }, [selectedChildId]);

  return null;
}

export default function RootLayout() {
  const { user, isAuthenticated, isLoading, onboardingCompleted } = useAuthStore();
  const { selectedChildId } = useChildStore();
  const { settings } = useUIStore();
  const systemTheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const { setUser, setLoading, setOnboardingCompleted } = useAuthStore.getState();

    const unsubscribe = AuthService.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setOnboardingCompleted(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const { setChildren, selectChild } = useChildStore.getState();
    const { setCabinets } = useCabinetStore.getState();

    if (!user) {
      setChildren([]);
      setCabinets([]);
      return;
    }

    const applyChildren = (children: ReturnType<typeof useChildStore.getState>['children']) => {
      setChildren(children);

      const currentSelected = useChildStore.getState().selectedChildId;
      const nextSelected =
        (currentSelected && children.some((child) => child.id === currentSelected)
          ? currentSelected
          : children[0]?.id) ?? null;

      if (nextSelected) {
        selectChild(nextSelected);
      } else {
        setCabinets([]);
      }
    };

    let parentChildren: Parameters<typeof applyChildren>[0] = [];
    let linkedChildren: Parameters<typeof applyChildren>[0] = [];

    const sync = () => {
      const byId = new Map([...parentChildren, ...linkedChildren].map((child) => [child.id, child]));
      applyChildren(Array.from(byId.values()));
    };

    const unsubscribeParent = ChildService.subscribeToChildren(user.uid, (children) => {
      parentChildren = children;
      sync();
    });

    const unsubscribeLinked = ChildService.subscribeToLinkedChildren(user.uid, (children) => {
      linkedChildren = children;
      sync();
    });

    return () => {
      unsubscribeParent();
      unsubscribeLinked();
    };
  }, [user?.uid]);

  useEffect(() => {
    const { setCabinets, setActiveCabinet } = useCabinetStore.getState();

    if (!selectedChildId || !user) {
      setCabinets([]);
      return;
    }

    const unsubscribe = CabinetService.subscribeToCabinets(selectedChildId, user.uid, (cabinets) => {
      setCabinets(cabinets);

      const currentActive = useCabinetStore.getState().activeCabinetId;
      const activeCabinets = cabinets.filter((cabinet) => cabinet.status !== 'archived' && !cabinet.archivedAt);
      const nextActive =
        (currentActive && activeCabinets.some((cabinet) => cabinet.id === currentActive)
          ? currentActive
          : activeCabinets[0]?.id) ?? null;

      if (nextActive) {
        setActiveCabinet(nextActive);
      }
    });

    return () => unsubscribe();
  }, [selectedChildId, user?.uid]);

  useEffect(() => {
    i18n.changeLanguage(settings.language);
  }, [settings.language]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthScreen = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';

    if (!isAuthenticated && !inAuthScreen) {
      blurActiveElementOnWeb();
      router.replace('/auth');
    } else if (isAuthenticated && !onboardingCompleted && !inOnboarding) {
      blurActiveElementOnWeb();
      router.replace('/onboarding');
    } else if (isAuthenticated && onboardingCompleted && (inAuthScreen || inOnboarding)) {
      blurActiveElementOnWeb();
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, onboardingCompleted, segments, router]);

  const isDarkTheme = settings.theme === 'dark' || (settings.theme === 'system' && systemTheme === 'dark');
  const theme = isDarkTheme ? darkTheme : lightTheme;

  return (
    <PaperProvider key={`${settings.language}-${settings.theme}`} theme={theme}>
      <View style={layoutStyles.root}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="auth" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="child-new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="child-edit" />
          <Stack.Screen name="child-link" />
          <Stack.Screen name="cabinet-new" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="pin" />
          <Stack.Screen name="achievements" />
          <Stack.Screen name="daily-quests" />
          <Stack.Screen name="duels" />
          <Stack.Screen name="my-rewards" />
          <Stack.Screen name="reward-new" />
        </Stack>
        <ChildPraiseWatcher />
        <ChildProgressSyncer />
      </View>
    </PaperProvider>
  );
}

const layoutStyles = StyleSheet.create({
  root: { flex: 1 },
});

const praiseStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
    justifyContent: 'flex-start',
    paddingTop: 54,
    paddingHorizontal: 18,
  },
  touchWrap: { alignSelf: 'stretch' },
  card: {
    minHeight: 92,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: Colors.darkSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconBubble: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 30 },
  textBlock: { flex: 1, minWidth: 0 },
  title: { color: Colors.darkTextPrimary, fontSize: 17, fontWeight: '900', marginBottom: 3 },
  message: { color: Colors.darkTextSecondary, fontSize: 14, fontWeight: '700', lineHeight: 19 },
});

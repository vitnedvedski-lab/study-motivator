import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Archive, BarChart3, Bell, Check, ChevronDown, ChevronLeft, Copy, Crown, HelpCircle, Link, Lock, LogOut, Pencil, Plus, ShieldCheck, Smartphone, Trash2, UserRoundCog, Volume2 } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../stores/authStore';
import { useCabinetStore } from '../stores/cabinetStore';
import { useChildStore } from '../stores/childStore';
import { useUIStore } from '../stores/uiStore';
import { AuthService } from '../services/authService';
import { CabinetService } from '../services/cabinetService';
import { DEFAULT_CATEGORY_WEIGHTS } from '../utils/gradeScoring';
import { normalizeDateDisplay } from '../utils/datePeriod';
import { Cabinet, CategoryWeights, SubjectCategory } from '../types';
import i18n from '../locales/i18n';

const LANGUAGES = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Francais' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'es', label: 'Espanol' },
  { code: 'zh', label: '中文' },
] as const;

const THEMES = [
  { key: 'light', labelKey: 'themeLight' },
  { key: 'dark', labelKey: 'themeDark' },
  { key: 'system', labelKey: 'themeSystem' },
] as const;

const CABINET_MANAGE_COPY = {
  ru: {
    title: 'Кабинеты',
    create: 'Создать кабинет',
    noChild: 'Сначала выберите ребёнка.',
    noCabinets: 'У выбранного ребёнка пока нет кабинетов.',
    active: 'Активный',
    completed: 'Завершён',
    archived: 'Архив',
    archive: 'В архив',
    delete: 'Удалить',
    duplicateTitle: 'Активный кабинет уже есть',
    duplicatePrompt: 'У ребёнка может быть только один активный кабинет. Завершите, архивируйте или удалите текущий кабинет перед созданием нового.',
    archiveTitle: 'Перенести в архив?',
    archivePrompt: 'Кабинет «{{name}}» останется доступен в истории и статистике, но не будет использоваться как текущий.',
    deleteTitle: 'Удалить кабинет?',
    deletePrompt: 'Кабинет «{{name}}» будет удалён. Это действие нельзя отменить.',
    archiveError: 'Не удалось перенести кабинет в архив.',
    deleteError: 'Не удалось удалить кабинет.',
  },
  en: {
    title: 'Cabinets',
    create: 'Create cabinet',
    noChild: 'Select a child first.',
    noCabinets: 'The selected child has no cabinets yet.',
    active: 'Active',
    completed: 'Completed',
    archived: 'Archive',
    archive: 'Archive',
    delete: 'Delete',
    duplicateTitle: 'Active cabinet exists',
    duplicatePrompt: 'A child can have only one active cabinet. Complete, archive, or delete the current cabinet before creating a new one.',
    archiveTitle: 'Move to archive?',
    archivePrompt: 'Cabinet "{{name}}" will remain available in history and statistics, but will not be used as current.',
    deleteTitle: 'Delete cabinet?',
    deletePrompt: 'Cabinet "{{name}}" will be deleted. This cannot be undone.',
    archiveError: 'Could not archive the cabinet.',
    deleteError: 'Could not delete the cabinet.',
  },
  zh: {
    title: '档案',
    create: '创建档案',
    noChild: '请先选择孩子。',
    noCabinets: '所选孩子还没有档案。',
    active: '进行中',
    completed: '已完成',
    archived: '归档',
    archive: '归档',
    delete: '删除',
    duplicateTitle: '已有进行中的档案',
    duplicatePrompt: '每个孩子只能有一个进行中的档案。请先完成、归档或删除当前档案。',
    archiveTitle: '移入归档？',
    archivePrompt: '档案“{{name}}”仍可在历史和统计中查看，但不会作为当前档案使用。',
    deleteTitle: '删除档案？',
    deletePrompt: '档案“{{name}}”将被删除，此操作无法撤销。',
    archiveError: '无法归档档案。',
    deleteError: '无法删除档案。',
  },
} as const;

const SETTINGS_COPY = {
  ru: {
    title: 'Настройки',
    plan: 'Тариф',
    premiumPrompt: 'Выберите вариант оплаты подписки.',
    month: 'Месяц',
    year: 'Год',
    cancel: 'Отмена',
    freeText: '1 ребёнок, до 5 предметов, базовый магазин и история.',
    premiumText: 'Несколько детей, дневник, расширенный магазин, архивы, статистика и рекомендации.',
    parentProfile: 'Профиль родителя',
    parentName: 'Имя родителя',
    parentPlaceholder: 'Как к вам обращаться',
    confirm: 'Подтвердить',
    security: 'Безопасность и семья',
    pinMode: 'PIN и режим ребёнка',
    childMode: 'Детский',
    parentMode: 'Родительский',
    childProfile: 'Профиль ребёнка',
    notSelected: 'Не выбран',
    linkChild: 'Связать устройство ребёнка',
    language: 'Язык',
    theme: 'Внешний вид',
    themeLight: 'Светлая',
    themeDark: 'Тёмная',
    themeSystem: 'Системная',
    saveLanguageTheme: 'Сохранить язык и внешний вид',
    saved: 'Настройки применены',
    weights: 'Коэффициенты важности',
    weightsIntro: 'Коэффициенты умножают базовые баллы за оценку и помогают выделить важные предметы.',
    weightsInfo: 'Пример: если базовая оценка даёт 4 балла, категория A с коэффициентом 1.5 начислит 6 баллов. Чем выше коэффициент, тем сильнее предмет влияет на прогресс периода.',
    weightA: 'Категория A',
    weightAHint: 'Сложные и самые важные предметы',
    weightB: 'Категория B',
    weightBHint: 'Предметы средней важности',
    weightC: 'Категория C',
    weightCHint: 'Базовая важность предмета',
    noCabinet: 'Сначала создайте учебный кабинет.',
    saveWeights: 'Сохранить коэффициенты',
    weightsSaved: 'Коэффициенты важности сохранены.',
    weightsInvalid: 'Введите числа от 0.1 до 10.',
    preferences: 'Предпочтения',
    push: 'Push-уведомления',
    sounds: 'Звуки',
    account: 'Аккаунт',
    signOut: 'Выйти из аккаунта',
    signOutTitle: 'Выход',
    signOutPrompt: 'Вы уверены, что хотите выйти?',
    error: 'Ошибка',
    weightsError: 'Не удалось сохранить коэффициенты.',
  },
  en: {
    title: 'Settings',
    plan: 'Plan',
    premiumPrompt: 'Choose a subscription payment option.',
    month: 'Monthly',
    year: 'Yearly',
    cancel: 'Cancel',
    freeText: '1 child, up to 5 subjects, basic shop and history.',
    premiumText: 'Multiple children, diary, extended shop and recommendations.',
    parentProfile: 'Parent profile',
    parentName: 'Parent name',
    parentPlaceholder: 'How should we address you',
    confirm: 'Confirm',
    security: 'Security and family',
    pinMode: 'PIN and child mode',
    childMode: 'Child',
    parentMode: 'Parent',
    childProfile: 'Child profile',
    notSelected: 'Not selected',
    linkChild: 'Link child device',
    language: 'Language',
    theme: 'Appearance',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    saveLanguageTheme: 'Save language and appearance',
    saved: 'Settings applied',
    weights: 'Importance coefficients',
    weightsIntro: 'Coefficients multiply base points for grades and help emphasize important subjects.',
    weightsInfo: 'Example: if a base grade gives 4 points, category A with coefficient 1.5 gives 6 points. The higher the coefficient, the stronger the subject affects period progress.',
    weightA: 'Category A',
    weightAHint: 'Difficult and most important subjects',
    weightB: 'Category B',
    weightBHint: 'Medium-importance subjects',
    weightC: 'Category C',
    weightCHint: 'Base subject importance',
    noCabinet: 'Create a study cabinet first.',
    saveWeights: 'Save coefficients',
    weightsSaved: 'Importance coefficients saved.',
    weightsInvalid: 'Enter numbers from 0.1 to 10.',
    preferences: 'Preferences',
    push: 'Push notifications',
    sounds: 'Sounds',
    account: 'Account',
    signOut: 'Sign out',
    signOutTitle: 'Sign out',
    signOutPrompt: 'Are you sure you want to sign out?',
    error: 'Error',
    weightsError: 'Could not save coefficients.',
  },
  zh: {
    title: '设置',
    plan: '方案',
    premiumPrompt: '请选择订阅付款方式。',
    month: '月付',
    year: '年付',
    cancel: '取消',
    freeText: '1 个孩子，最多 5 门科目，基础商店和历史。',
    premiumText: '多个孩子、日记、扩展商店、档案、统计和建议。',
    parentProfile: '家长资料',
    parentName: '家长姓名',
    parentPlaceholder: '如何称呼您',
    confirm: '确认',
    security: '安全与家庭',
    pinMode: 'PIN 和儿童模式',
    childMode: '儿童',
    parentMode: '家长',
    childProfile: '儿童资料',
    notSelected: '未选择',
    linkChild: '绑定孩子设备',
    language: '语言',
    theme: '外观',
    themeLight: '浅色',
    themeDark: '深色',
    themeSystem: '系统',
    saveLanguageTheme: '保存语言和外观',
    saved: '设置已应用',
    weights: '重要性系数',
    weightsIntro: '系数会乘以成绩基础积分，用于突出重要科目。',
    weightsInfo: '例如：基础成绩给 4 积分，A 类系数 1.5 会得到 6 积分。系数越高，该科目对周期进度的影响越大。',
    weightA: '类别 A',
    weightAHint: '困难且最重要的科目',
    weightB: '类别 B',
    weightBHint: '中等重要性的科目',
    weightC: '类别 C',
    weightCHint: '科目的基础重要性',
    noCabinet: '请先创建学习档案。',
    saveWeights: '保存系数',
    weightsSaved: '重要性系数已保存。',
    weightsInvalid: '请输入 0.1 到 10 的数字。',
    preferences: '偏好',
    push: '推送通知',
    sounds: '声音',
    account: '账号',
    signOut: '退出账号',
    signOutTitle: '退出',
    signOutPrompt: '确定要退出吗？',
    error: '错误',
    weightsError: '无法保存系数。',
  },
} as const;

type SettingsCopy = Record<keyof typeof SETTINGS_COPY.ru, string>;

const CATEGORY_WEIGHT_FIELDS: {
  key: SubjectCategory;
  titleKey: 'weightA' | 'weightB' | 'weightC';
  hintKey: 'weightAHint' | 'weightBHint' | 'weightCHint';
}[] = [
  { key: 'A', titleKey: 'weightA', hintKey: 'weightAHint' },
  { key: 'B', titleKey: 'weightB', hintKey: 'weightBHint' },
  { key: 'C', titleKey: 'weightC', hintKey: 'weightCHint' },
];

const getPalette = (theme: 'light' | 'dark' | 'system', systemTheme: 'light' | 'dark' | null | undefined) => {
  const resolved = theme === 'system' ? (systemTheme === 'dark' ? 'dark' : 'light') : theme;
  return resolved === 'dark'
    ? {
        background: Colors.darkBackground,
        surface: Colors.darkSurface,
        textPrimary: Colors.darkTextPrimary,
        textSecondary: Colors.darkTextSecondary,
        border: Colors.darkBorder,
        divider: Colors.darkBorder,
      }
    : {
        background: Colors.background,
        surface: Colors.surface,
        textPrimary: Colors.textPrimary,
        textSecondary: Colors.textSecondary,
        border: Colors.border,
        divider: Colors.divider,
      };
};

export default function SettingsScreen() {
  const router = useRouter();
  const systemTheme = useColorScheme();
  const { signOut } = useAuthStore();
  const { children, selectedChild, selectChild } = useChildStore();
  const { activeCabinet, cabinets, updateCabinet, removeCabinet, setWizardFromCabinet, resetWizard } = useCabinetStore();
  const { settings, updateSettings } = useUIStore();
  const child = selectedChild();
  const cabinet = activeCabinet();
  const [languageDraft, setLanguageDraft] = useState(settings.language);
  const [themeDraft, setThemeDraft] = useState(settings.theme);
  const [parentNameDraft, setParentNameDraft] = useState(settings.parentName ?? '');
  const [weightsDraft, setWeightsDraft] = useState<Record<SubjectCategory, string>>({
    A: String(DEFAULT_CATEGORY_WEIGHTS.A),
    B: String(DEFAULT_CATEGORY_WEIGHTS.B),
    C: String(DEFAULT_CATEGORY_WEIGHTS.C),
  });
  const [savingWeights, setSavingWeights] = useState(false);
  const [cabinetTab, setCabinetTab] = useState<'active' | 'archive'>('active');
  const [archiveCabinetsOpen, setArchiveCabinetsOpen] = useState(false);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);

  const copy: SettingsCopy = SETTINGS_COPY[languageDraft as keyof typeof SETTINGS_COPY] ?? SETTINGS_COPY.en;
  const cabinetCopy = CABINET_MANAGE_COPY[languageDraft as keyof typeof CABINET_MANAGE_COPY] ?? CABINET_MANAGE_COPY.en;
  const palette = useMemo(() => getPalette(themeDraft, systemTheme), [themeDraft, systemTheme]);
  const childCabinets = useMemo(
    () =>
      child
        ? cabinets
            .filter((item) => item.childId === child.id)
            .sort((left, right) => right.createdAt - left.createdAt)
        : [],
    [cabinets, child?.id],
  );
  const hasActiveChildCabinet = childCabinets.some(
    (item) => item.status !== 'completed' && item.status !== 'archived' && !item.archivedAt,
  );
  const visibleCabinets = childCabinets.filter((item) => {
    const archived = item.status === 'archived' || Boolean(item.archivedAt);
    return cabinetTab === 'archive' ? archived : !archived;
  });

  useEffect(() => {
    setLanguageDraft(settings.language);
    setThemeDraft(settings.theme);
    setParentNameDraft(settings.parentName ?? '');
  }, [settings.language, settings.theme, settings.parentName]);

  useEffect(() => {
    const weights = cabinet?.categoryWeights ?? DEFAULT_CATEGORY_WEIGHTS;
    setWeightsDraft({
      A: String(weights.A ?? DEFAULT_CATEGORY_WEIGHTS.A),
      B: String(weights.B ?? DEFAULT_CATEGORY_WEIGHTS.B),
      C: String(weights.C ?? DEFAULT_CATEGORY_WEIGHTS.C),
    });
  }, [cabinet?.id, cabinet?.categoryWeights?.A, cabinet?.categoryWeights?.B, cabinet?.categoryWeights?.C]);

  const profileChanged = parentNameDraft.trim() !== (settings.parentName ?? '');
  const languageChanged = languageDraft !== settings.language;
  const themeChanged = themeDraft !== settings.theme;

  const handlePremiumToggle = (value: boolean) => {
    if (!value) {
      updateSettings({ subscription: 'free' });
      return;
    }

    Alert.alert('Premium', copy.premiumPrompt, [
      { text: copy.month, onPress: () => updateSettings({ subscription: 'premium' }) },
      { text: copy.year, onPress: () => updateSettings({ subscription: 'premium' }) },
      { text: copy.cancel, style: 'cancel' },
    ]);
  };

  const handleSaveLanguageTheme = async () => {
    await i18n.changeLanguage(languageDraft);
    updateSettings({ language: languageDraft, theme: themeDraft });
    Alert.alert(copy.saved);
  };

  const handleSaveProfile = () => {
    updateSettings({ parentName: parentNameDraft.trim() || undefined });
  };

  const handleSaveWeights = async () => {
    if (!cabinet) {
      Alert.alert(copy.weights, copy.noCabinet);
      return;
    }

    const weights: CategoryWeights = {
      A: Number(weightsDraft.A.replace(',', '.')),
      B: Number(weightsDraft.B.replace(',', '.')),
      C: Number(weightsDraft.C.replace(',', '.')),
    };

    if (Object.values(weights).some((value) => !Number.isFinite(value) || value <= 0 || value > 10)) {
      Alert.alert(copy.weights, copy.weightsInvalid);
      return;
    }

    setSavingWeights(true);
    try {
      await CabinetService.updateCabinet(cabinet.id, { categoryWeights: weights });
      updateCabinet(cabinet.id, { categoryWeights: weights });
      Alert.alert(copy.weightsSaved);
    } catch (error) {
      console.error('Category weights update error:', error);
      Alert.alert(copy.error, copy.weightsError);
    } finally {
      setSavingWeights(false);
    }
  };

  const getCabinetStatusLabel = (item: Cabinet) => {
    if (item.status === 'archived' || item.archivedAt) return cabinetCopy.archived;
    if (item.status === 'completed') return cabinetCopy.completed;
    return cabinetCopy.active;
  };

  const handleCreateCabinet = () => {
    if (!child) {
      Alert.alert(cabinetCopy.title, cabinetCopy.noChild);
      return;
    }

    if (hasActiveChildCabinet) {
      Alert.alert(cabinetCopy.duplicateTitle, cabinetCopy.duplicatePrompt);
      return;
    }

    resetWizard();
    router.push({ pathname: '/cabinet-new', params: { fresh: '1' } });
  };

  const handleCopyCabinet = (item: Cabinet) => {
    if (hasActiveChildCabinet) {
      Alert.alert(cabinetCopy.duplicateTitle, cabinetCopy.duplicatePrompt);
      return;
    }
    setWizardFromCabinet(item);
    router.push({ pathname: '/cabinet-new', params: { copy: '1' } });
  };

  const handleArchiveCabinet = (item: Cabinet) => {
    Alert.alert(
      cabinetCopy.archiveTitle,
      cabinetCopy.archivePrompt.replace('{{name}}', item.name),
      [
        { text: copy.cancel, style: 'cancel' },
        {
          text: cabinetCopy.archive,
          onPress: async () => {
            try {
              const updates: Partial<Cabinet> = { status: 'archived', archivedAt: Date.now() };
              await CabinetService.updateCabinet(item.id, updates);
              updateCabinet(item.id, updates);
            } catch (error) {
              console.error('Cabinet archive error:', error);
              Alert.alert(copy.error, cabinetCopy.archiveError);
            }
          },
        },
      ],
    );
  };

  const handleDeleteCabinet = (item: Cabinet) => {
    Alert.alert(
      cabinetCopy.deleteTitle,
      cabinetCopy.deletePrompt.replace('{{name}}', item.name),
      [
        { text: copy.cancel, style: 'cancel' },
        {
          text: cabinetCopy.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await CabinetService.hardDeleteCabinet(item.id);
              removeCabinet(item.id);
            } catch (error) {
              console.error('Cabinet delete error:', error);
              Alert.alert(copy.error, cabinetCopy.deleteError);
            }
          },
        },
      ],
    );
  };

  const handleSignOut = () => {
    Alert.alert(copy.signOutTitle, copy.signOutPrompt, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.signOut,
        style: 'destructive',
        onPress: async () => {
          await AuthService.signOut();
          signOut();
          router.replace('/auth');
        },
      },
    ]);
  };

  const handleOpenGuide = () => {
    const parentGuide = [
      '1. Добавьте ребёнка и создайте для него кабинет.',
      '2. В кабинете выберите период, предметы, категории и расписание.',
      '3. В дневнике или вкладке добавления ставьте оценки, спорт, поведение и задания.',
      '4. В конце периода проверьте итоги: если минимальный порог набран, ребёнок сможет использовать награды.',
      '5. В статистике смотрите динамику баллов, оценки и рекомендации по предметам.',
    ].join('\n\n');
    const childGuide = [
      '1. Смотри свои баллы, уровень и достижения.',
      '2. Получай новые карточки коллекции за результаты.',
      '3. После завершения периода используй доступные баллы в магазине наград.',
      '4. Настройки ребёнка ограничены, чтобы нельзя было менять правила начисления.',
    ].join('\n\n');
    Alert.alert('Как пользоваться', settings.accessMode === 'child' ? childGuide : parentGuide);
  };

  const handleOpenDisclaimer = () => {
    Alert.alert(
      'Пользовательское соглашение',
      'Приложение является вспомогательным инструментом для учёта оценок, баллов, задач, рекомендаций и семейных наград. Приложение, его владелец и разработчик не гарантируют учебный, воспитательный, психологический или иной результат ребёнка и не несут ответственности за решения, принятые пользователями на основе данных приложения. Ответственность за обучение, воспитание, здоровье, безопасность, мотивацию и поощрения ребёнка несут родители или законные представители. Используя приложение, пользователь подтверждает, что понимает рекомендательный характер всех расчётов и рекомендаций.',
    );
  };

  const renderOption = <T extends string>(value: T, label: string, active: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={value}
      style={[styles.optionRow, { borderColor: palette.divider }]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
    >
      <Text style={[styles.optionLabel, { color: active ? Colors.primary : palette.textPrimary }, active && styles.optionLabelActive]}>
        {label}
      </Text>
      {active && <Check size={18} color={Colors.primary} />}
    </TouchableOpacity>
  );

  const renderLanguagePicker = () => {
    const selectedLanguage = LANGUAGES.find((language) => language.code === languageDraft) ?? LANGUAGES[0];
    return (
      <View style={styles.dropdownWrap}>
        <TouchableOpacity
          style={[styles.dropdownButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={() => setLanguagePickerOpen((value) => !value)}
        >
          <Text style={[styles.dropdownText, { color: palette.textPrimary }]}>{selectedLanguage.label}</Text>
          <ChevronDown size={18} color={Colors.primary} />
        </TouchableOpacity>
        {languagePickerOpen && (
          <Card style={[styles.dropdownMenu, { backgroundColor: palette.surface }]}>
            {LANGUAGES.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={styles.dropdownOption}
                onPress={() => {
                  setLanguageDraft(language.code);
                  setLanguagePickerOpen(false);
                }}
              >
                <Text style={[styles.dropdownText, { color: languageDraft === language.code ? Colors.primary : palette.textPrimary }]}>{language.label}</Text>
                {languageDraft === language.code && <Check size={16} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
          </Card>
        )}
      </View>
    );
  };

  if (settings.accessMode === 'child') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={[styles.header, { backgroundColor: palette.background }]}>
          <Button title="" onPress={() => router.back()} variant="ghost" icon={<ChevronLeft size={24} color={palette.textPrimary} />} />
          <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>{copy.title}</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Помощь</Text>
          <Card style={[styles.helpCard, { backgroundColor: palette.surface }]}>
            <TouchableOpacity style={styles.helpButton} onPress={handleOpenGuide}>
              <HelpCircle size={20} color={Colors.primary} />
              <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>Как пользоваться</Text>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: palette.divider }]} />
            <TouchableOpacity style={styles.helpButton} onPress={handleOpenDisclaimer}>
              <ShieldCheck size={20} color={Colors.primary} />
              <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>Пользовательское соглашение</Text>
            </TouchableOpacity>
          </Card>

          <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{copy.language}</Text>
          {renderLanguagePicker()}

          <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{copy.theme}</Text>
          <Card style={{ backgroundColor: palette.surface }}>
            {THEMES.map((theme) =>
              renderOption(theme.key, copy[theme.labelKey], themeDraft === theme.key, () => setThemeDraft(theme.key)),
            )}
          </Card>
          <Button title={copy.saveLanguageTheme} onPress={handleSaveLanguageTheme} disabled={!languageChanged && !themeChanged} />

          <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{copy.preferences}</Text>
          <Card style={{ backgroundColor: palette.surface }}>
            <View style={styles.settingItem}>
              <Bell size={20} color={Colors.primary} />
              <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>{copy.push}</Text>
              <Switch value={settings.notificationsEnabled} onValueChange={(value) => updateSettings({ notificationsEnabled: value })} />
            </View>
            <View style={[styles.divider, { backgroundColor: palette.divider }]} />
            <View style={styles.settingItem}>
              <Volume2 size={20} color={Colors.primary} />
              <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>{copy.sounds}</Text>
              <Switch value={settings.soundEnabled} onValueChange={(value) => updateSettings({ soundEnabled: value })} />
            </View>
            <View style={[styles.divider, { backgroundColor: palette.divider }]} />
            <View style={styles.settingItem}>
              <Smartphone size={20} color={Colors.primary} />
              <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>Vibration</Text>
              <Switch value={settings.hapticsEnabled !== false} onValueChange={(value) => updateSettings({ hapticsEnabled: value })} />
            </View>
          </Card>

          <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{copy.account}</Text>
          <Card style={{ backgroundColor: palette.surface }}>
            <TouchableOpacity style={styles.dangerItem} onPress={handleSignOut}>
              <LogOut size={20} color={Colors.danger} />
              <Text style={styles.dangerText}>{copy.signOut}</Text>
            </TouchableOpacity>
          </Card>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.background }]}>
        <Button title="" onPress={() => router.back()} variant="ghost" icon={<ChevronLeft size={24} color={palette.textPrimary} />} />
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>{copy.title}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{copy.plan}</Text>
        <Card style={[styles.planCard, { backgroundColor: palette.surface }]}>
          <View style={styles.planOptionRow}>
            <View style={styles.planTextBlock}>
              <View style={styles.planTitleRow}>
                <Crown size={20} color={Colors.primary} />
                <Text style={[styles.planName, { color: palette.textPrimary }]}>Free</Text>
              </View>
              <Text style={[styles.planText, { color: palette.textSecondary }]}>{copy.freeText}</Text>
            </View>
            <Switch
              value={settings.subscription === 'free'}
              onValueChange={(value) => {
                if (value) updateSettings({ subscription: 'free' });
              }}
              trackColor={{ false: palette.border, true: Colors.primary }}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: palette.divider }]} />
          <View style={styles.planOptionRow}>
            <View style={styles.planTextBlock}>
              <View style={styles.planTitleRow}>
                <Crown size={20} color={Colors.primary} />
                <Text style={[styles.planName, { color: palette.textPrimary }]}>Premium</Text>
              </View>
              <Text style={[styles.planText, { color: palette.textSecondary }]}>{copy.premiumText}</Text>
            </View>
            <Switch
              value={settings.subscription === 'premium'}
              onValueChange={handlePremiumToggle}
              trackColor={{ false: palette.border, true: Colors.primary }}
            />
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{copy.parentProfile}</Text>
        <Card style={[styles.profileCard, { backgroundColor: palette.surface }]}>
          <Input label={copy.parentName} value={parentNameDraft} onChangeText={setParentNameDraft} placeholder={copy.parentPlaceholder} />
          <Button title={copy.confirm} onPress={handleSaveProfile} disabled={!profileChanged} />
        </Card>

        <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{copy.security}</Text>
        <Card style={{ backgroundColor: palette.surface }}>
          <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/pin')}>
            <Lock size={20} color={Colors.primary} />
            <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>{copy.pinMode}</Text>
            <Text style={[styles.settingValue, { color: palette.textSecondary }]}>
              {copy.parentMode}
            </Text>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: palette.divider }]} />
          <TouchableOpacity style={styles.settingItem} onPress={() => router.push({ pathname: '/child-edit', params: { id: child?.id } })}>
            <UserRoundCog size={20} color={Colors.primary} />
            <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>{copy.childProfile}</Text>
            <Text style={[styles.settingValue, { color: palette.textSecondary }]}>{child?.name ?? copy.notSelected}</Text>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: palette.divider }]} />
          <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/child-link')}>
            <Link size={20} color={Colors.primary} />
            <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>{copy.linkChild}</Text>
          </TouchableOpacity>
        </Card>

        <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{cabinetCopy.title}</Text>
        <Card style={[styles.cabinetManageCard, { backgroundColor: palette.surface }]}>
          <View style={styles.cabinetManageHeader}>
            <View style={styles.cabinetManageTitleBlock}>
              <Text style={[styles.cabinetManageTitle, { color: palette.textPrimary }]}>{child?.name ?? cabinetCopy.noChild}</Text>
              <Text style={[styles.cabinetManageHint, { color: palette.textSecondary }]}>
                {child ? `${childCabinets.length}` : '0'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.createCabinetButton, { borderColor: hasActiveChildCabinet ? palette.border : Colors.primary }]}
              onPress={handleCreateCabinet}
              accessibilityRole="button"
            >
              <Plus size={16} color={hasActiveChildCabinet ? palette.textSecondary : Colors.primary} />
              <Text style={[styles.createCabinetText, { color: hasActiveChildCabinet ? palette.textSecondary : Colors.primary }]}>
                {cabinetCopy.create}
              </Text>
            </TouchableOpacity>
          </View>

          {children.length > 1 && (
            <View style={styles.settingsChildList}>
              {children.map((item) => {
                const active = item.id === child?.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.settingsChildChip,
                      { borderColor: active ? Colors.primary : palette.border, backgroundColor: active ? Colors.primary + '1A' : palette.background },
                    ]}
                    onPress={() => selectChild(item.id)}
                  >
                    <Text style={[styles.settingsChildChipText, { color: active ? Colors.primary : palette.textSecondary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {child && childCabinets.length > 0 && (
            <View style={styles.cabinetTabs}>
              <TouchableOpacity
                style={[styles.cabinetTab, { borderColor: cabinetTab === 'active' ? Colors.primary : palette.border, backgroundColor: cabinetTab === 'active' ? Colors.primary + '1A' : palette.background }]}
                onPress={() => setCabinetTab('active')}
              >
                <Text style={[styles.cabinetTabText, { color: cabinetTab === 'active' ? Colors.primary : palette.textSecondary }]}>{cabinetCopy.active}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cabinetTab, { borderColor: cabinetTab === 'archive' ? Colors.primary : palette.border, backgroundColor: cabinetTab === 'archive' ? Colors.primary + '1A' : palette.background }]}
                onPress={() => setCabinetTab('archive')}
              >
                <Text style={[styles.cabinetTabText, { color: cabinetTab === 'archive' ? Colors.primary : palette.textSecondary }]}>{cabinetCopy.archived}</Text>
              </TouchableOpacity>
            </View>
          )}

          {!child ? (
            <Text style={[styles.emptyCabinetText, { color: palette.textSecondary }]}>{cabinetCopy.noChild}</Text>
          ) : childCabinets.length === 0 ? (
            <Text style={[styles.emptyCabinetText, { color: palette.textSecondary }]}>{cabinetCopy.noCabinets}</Text>
          ) : visibleCabinets.length === 0 ? (
            <Text style={[styles.emptyCabinetText, { color: palette.textSecondary }]}>{cabinetCopy.noCabinets}</Text>
          ) : cabinetTab === 'archive' && !archiveCabinetsOpen ? (
            <TouchableOpacity
              style={[styles.archiveDropdownButton, { borderColor: palette.border, backgroundColor: palette.background }]}
              onPress={() => setArchiveCabinetsOpen(true)}
            >
              <Text style={[styles.archiveDropdownText, { color: Colors.primary }]}>Показать архив ({visibleCabinets.length})</Text>
            </TouchableOpacity>
          ) : (
            visibleCabinets.map((item, index) => {
              const isArchived = item.status === 'archived' || Boolean(item.archivedAt);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.cabinetManageRow,
                    index > 0 && { borderTopColor: palette.divider, borderTopWidth: StyleSheet.hairlineWidth },
                  ]}
                  activeOpacity={isArchived ? 0.75 : 1}
                  onPress={() => {
                    if (isArchived) {
                      router.push({ pathname: '/(tabs)/stats', params: { cabinetId: item.id } });
                    }
                  }}
                >
                  <View style={styles.cabinetManageInfo}>
                    <View style={styles.cabinetNameRow}>
                      <Text style={[styles.cabinetManageName, { color: palette.textPrimary }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={[styles.statusPill, { backgroundColor: isArchived ? palette.background : Colors.primary + '1A' }]}>
                        <Text style={[styles.statusPillText, { color: isArchived ? palette.textSecondary : Colors.primary }]}>
                          {getCabinetStatusLabel(item)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.cabinetManageDates, { color: palette.textSecondary }]}>
                      {normalizeDateDisplay(item.startDate)} - {normalizeDateDisplay(item.endDate)}
                    </Text>
                  </View>
                  <View style={styles.cabinetActions}>
                    {!isArchived && (
                      <TouchableOpacity
                        style={[styles.cabinetActionButton, { borderColor: palette.border }]}
                        onPress={() => router.push({ pathname: '/cabinet-edit', params: { id: item.id } })}
                        accessibilityRole="button"
                      >
                        <Pencil size={16} color={Colors.primary} />
                      </TouchableOpacity>
                    )}
                    {isArchived && (
                      <TouchableOpacity
                        style={[styles.cabinetActionButton, { borderColor: palette.border }]}
                        onPress={() => router.push({ pathname: '/(tabs)/stats', params: { cabinetId: item.id } })}
                        accessibilityRole="button"
                      >
                        <BarChart3 size={16} color={Colors.primary} />
                      </TouchableOpacity>
                    )}
                    {isArchived && (
                      <TouchableOpacity
                        style={[styles.cabinetActionButton, { borderColor: palette.border }]}
                        onPress={() => handleCopyCabinet(item)}
                        accessibilityRole="button"
                      >
                        <Copy size={16} color={Colors.primary} />
                      </TouchableOpacity>
                    )}
                    {!isArchived && (
                      <TouchableOpacity
                        style={[styles.cabinetActionButton, { borderColor: palette.border }]}
                        onPress={() => handleArchiveCabinet(item)}
                        accessibilityRole="button"
                      >
                        <Archive size={16} color={Colors.primary} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.cabinetActionButton, { borderColor: palette.border }]}
                      onPress={() => handleDeleteCabinet(item)}
                      accessibilityRole="button"
                    >
                      <Trash2 size={16} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </Card>

        <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{copy.language}</Text>
        {renderLanguagePicker()}

        <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{copy.theme}</Text>
        <Card style={{ backgroundColor: palette.surface }}>
          {THEMES.map((theme) =>
            renderOption(theme.key, copy[theme.labelKey], themeDraft === theme.key, () => setThemeDraft(theme.key)),
          )}
        </Card>
        <Button title={copy.saveLanguageTheme} onPress={handleSaveLanguageTheme} disabled={!languageChanged && !themeChanged} />

        <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{copy.weights}</Text>
        <Card style={[styles.weightsCard, { backgroundColor: palette.surface }]}>
          {cabinet ? (
            <>
              <Text style={[styles.weightsIntro, { color: palette.textSecondary }]}>{copy.weightsIntro}</Text>
              <View style={[styles.infoBox, { backgroundColor: palette.background, borderColor: palette.border }]}>
                <Text style={[styles.infoText, { color: palette.textSecondary }]}>{copy.weightsInfo}</Text>
              </View>
              {CATEGORY_WEIGHT_FIELDS.map((item) => (
                <View key={item.key} style={styles.weightRow}>
                  <View style={styles.weightLabelBlock}>
                    <Text style={[styles.weightTitle, { color: palette.textPrimary }]}>{copy[item.titleKey]}</Text>
                    <Text style={[styles.weightHint, { color: palette.textSecondary }]}>{copy[item.hintKey]}</Text>
                  </View>
                  <Input
                    value={weightsDraft[item.key]}
                    onChangeText={(value) => setWeightsDraft((current) => ({ ...current, [item.key]: value.replace(',', '.') }))}
                    keyboardType="numeric"
                    style={styles.weightInput}
                  />
                </View>
              ))}
              <Button title={copy.saveWeights} onPress={handleSaveWeights} loading={savingWeights} />
            </>
          ) : (
            <Text style={[styles.weightsIntro, { color: palette.textSecondary }]}>{copy.noCabinet}</Text>
          )}
        </Card>

        <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{copy.preferences}</Text>
        <Card style={{ backgroundColor: palette.surface }}>
          <View style={styles.settingItem}>
            <Bell size={20} color={Colors.primary} />
            <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>{copy.push}</Text>
            <Switch value={settings.notificationsEnabled} onValueChange={(value) => updateSettings({ notificationsEnabled: value })} />
          </View>
          <View style={[styles.divider, { backgroundColor: palette.divider }]} />
          <View style={styles.settingItem}>
            <Volume2 size={20} color={Colors.primary} />
            <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>{copy.sounds}</Text>
            <Switch value={settings.soundEnabled} onValueChange={(value) => updateSettings({ soundEnabled: value })} />
          </View>
          <View style={[styles.divider, { backgroundColor: palette.divider }]} />
          <View style={styles.settingItem}>
            <Smartphone size={20} color={Colors.primary} />
            <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>Vibration</Text>
            <Switch value={settings.hapticsEnabled !== false} onValueChange={(value) => updateSettings({ hapticsEnabled: value })} />
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Помощь</Text>
        <Card style={[styles.helpCard, { backgroundColor: palette.surface }]}>
          <TouchableOpacity style={styles.helpButton} onPress={handleOpenGuide}>
            <HelpCircle size={20} color={Colors.primary} />
            <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>Как пользоваться</Text>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: palette.divider }]} />
          <TouchableOpacity style={styles.helpButton} onPress={handleOpenDisclaimer}>
            <ShieldCheck size={20} color={Colors.primary} />
            <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>Пользовательское соглашение</Text>
          </TouchableOpacity>
        </Card>

        <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{copy.account}</Text>
        <Card style={{ backgroundColor: palette.surface }}>
          <TouchableOpacity style={styles.dangerItem} onPress={handleSignOut}>
            <LogOut size={20} color={Colors.danger} />
            <Text style={styles.dangerText}>{copy.signOut}</Text>
          </TouchableOpacity>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 20, gap: 8 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 14,
  },
  planCard: { padding: 16, gap: 12 },
  planOptionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  planTextBlock: { flex: 1, minWidth: 0, gap: 4 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planName: { fontSize: 16, fontWeight: '800' },
  planText: { lineHeight: 19 },
  profileCard: { padding: 16, gap: 14 },
  helpCard: { padding: 0, overflow: 'hidden' },
  helpButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  cabinetManageCard: { padding: 0, overflow: 'hidden' },
  cabinetManageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  cabinetManageTitleBlock: { flex: 1, minWidth: 0 },
  cabinetManageTitle: { fontSize: 16, fontWeight: '800' },
  cabinetManageHint: { fontSize: 12, marginTop: 2 },
  createCabinetButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  createCabinetText: { fontSize: 12, fontWeight: '800' },
  settingsChildList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  settingsChildChip: { minHeight: 34, borderWidth: 1, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 10, maxWidth: '48%' },
  settingsChildChipText: { fontSize: 12, fontWeight: '800' },
  cabinetTabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  cabinetTab: { flex: 1, minHeight: 34, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  cabinetTabText: { fontSize: 12, fontWeight: '800' },
  emptyCabinetText: { paddingHorizontal: 16, paddingBottom: 16, lineHeight: 19 },
  archiveDropdownButton: {
    minHeight: 44,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  archiveDropdownText: { fontSize: 13, fontWeight: '900' },
  cabinetManageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  cabinetManageInfo: { flex: 1, minWidth: 0, gap: 6 },
  cabinetNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cabinetManageName: { flex: 1, fontSize: 15, fontWeight: '800' },
  cabinetManageDates: { fontSize: 12 },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: '800' },
  cabinetActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cabinetActionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  settingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  settingLabel: { flex: 1, fontSize: 16 },
  settingValue: { fontSize: 14 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  optionLabel: { fontSize: 16 },
  optionLabelActive: { fontWeight: '800' },
  dropdownWrap: { gap: 8 },
  dropdownButton: { minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownMenu: { overflow: 'hidden' },
  dropdownOption: { minHeight: 42, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownText: { fontSize: 15, fontWeight: '800' },
  divider: { height: 1 },
  weightsCard: { padding: 16, gap: 14 },
  weightsIntro: { lineHeight: 19 },
  infoBox: { borderWidth: 1, borderRadius: 10, padding: 12 },
  infoText: { fontSize: 12, lineHeight: 18 },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weightLabelBlock: { flex: 1 },
  weightTitle: { fontWeight: '800' },
  weightHint: { fontSize: 12, marginTop: 2 },
  weightInput: { width: 88 },
  dangerItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  dangerText: { color: Colors.danger, fontSize: 16, fontWeight: '700' },
});

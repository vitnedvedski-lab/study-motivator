import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Archive, CalendarCheck, Copy, Lock, LogOut, Pencil, Settings, Star, Swords, Trash2, Trophy, User } from 'lucide-react-native';
import { ActivityItem } from '../../components/ActivityItem';
import { CategoryCard } from '../../components/CategoryCard';
import { ChildSelector } from '../../components/ChildSelector';
import { Card } from '../../components/ui/Card';
import { Confetti } from '../../components/ui/Confetti';
import { LevelBadge } from '../../components/ui/LevelBadge';
import { StreakFlame } from '../../components/ui/StreakFlame';
import { LEVEL_CONFIGS } from '../../constants/levels';
import { getLevelByPoints } from '../../constants/levels';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useAppText } from '../../hooks/useAppText';
import { ActivityService } from '../../services/activityService';
import { AuthService } from '../../services/authService';
import { CabinetService } from '../../services/cabinetService';
import { ChildService } from '../../services/childService';
import { useAuthStore } from '../../stores/authStore';
import { useCabinetStore } from '../../stores/cabinetStore';
import { useChildStore } from '../../stores/childStore';
import { useUIStore } from '../../stores/uiStore';
import { Activity } from '../../types';
import { compareDateStrings, formatDateISO, normalizeDateDisplay, parseISODate } from '../../utils/datePeriod';
import { formatPoints } from '../../utils/gradeScoring';

export default function HomeScreen() {
  const router = useRouter();
  const palette = useAppTheme();
  const { text, tr } = useAppText();
  const { children, selectedChild, selectChild, updateChild } = useChildStore();
  const { signOut } = useAuthStore();
  const { activeCabinet, cabinets, updateCabinet, removeCabinet, setWizardFromCabinet, resetWizard } = useCabinetStore();
  const { settings } = useUIStore();
  const child = selectedChild();
  const cabinet = activeCabinet();
  const archivedChildCabinets = useMemo(
    () => cabinets.filter((item) => item.childId === child?.id && (item.status === 'archived' || item.archivedAt)),
    [cabinets, child?.id],
  );
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(true);
  const [periodPromptedId, setPeriodPromptedId] = useState<string | null>(null);
  const [copyPickerOpen, setCopyPickerOpen] = useState(false);

  useEffect(() => {
    if (!child) {
      setLoading(false);
      return;
    }

    setLoading(true);
    return ActivityService.subscribeToActivities(child.id, (data) => {
      setActivities(data);
      setLoading(false);
    });
  }, [child?.id]);

  const categoryStats = useMemo(() => ({
    study: activities.filter((a) => a.type === 'study').reduce((sum, item) => sum + item.points, 0),
    sport: activities.filter((a) => a.type === 'sport').reduce((sum, item) => sum + item.points, 0),
    behavior: activities.filter((a) => a.type === 'behavior').reduce((sum, item) => sum + item.points, 0),
    task: activities.filter((a) => a.type === 'task').reduce((sum, item) => sum + item.points, 0),
  }), [activities]);

  const categoryCounts = useMemo(() => ({
    study: activities.filter((a) => a.type === 'study').length,
    sport: activities.filter((a) => a.type === 'sport').length,
    behavior: activities.filter((a) => a.type === 'behavior').length,
    task: activities.filter((a) => a.type === 'task').length,
  }), [activities]);

  const cabinetActivities = useMemo(
    () => cabinet ? activities.filter((activity) => activity.cabinetId === cabinet.id) : [],
    [activities, cabinet?.id]
  );

  const periodPoints = useMemo(
    () => cabinetActivities.reduce((sum, activity) => sum + activity.points, 0),
    [cabinetActivities]
  );

  const periodProgress = useMemo(() => {
    if (!cabinet) return 0;
    const start = parseISODate(cabinet.startDate)?.getTime() ?? Date.now();
    const end = parseISODate(cabinet.endDate)?.getTime() ?? start;
    const today = parseISODate(formatDateISO(new Date()))?.getTime() ?? Date.now();
    if (end <= start) return 1;
    return Math.min(1, Math.max(0, (today - start) / (end - start)));
  }, [cabinet?.startDate, cabinet?.endDate]);

  const pointsTarget = Math.max(cabinet?.minPointsForReward ?? cabinet?.maxPointsPerPeriod ?? cabinet?.maxPointsPerDay ?? 100, 1);
  const pointsProgress = Math.min(1, Math.max(0, periodPoints / pointsTarget));

  const completeCurrentPeriod = async (archiveAfterComplete: boolean, manualTransfer: number | null = null) => {
    if (!child || !cabinet) return;
    const total = activities
      .filter((activity) => activity.cabinetId === cabinet.id)
      .reduce((sum, activity) => sum + activity.points, 0);
    const target = Math.max(cabinet.minPointsForReward ?? cabinet.maxPointsPerPeriod ?? cabinet.maxPointsPerDay ?? 100, 1);
    const completedAt = Date.now();

    const transferPoints = manualTransfer !== null
      ? Math.min(Math.max(manualTransfer, 0), Math.max(total, 0))
      : total >= target
        ? Math.max(total, 0)
        : 0;
    if (transferPoints > 0 || total < target) {
      // availablePoints не обнуляем: выведенные из копилки баллы остаются у ребёнка.
      const savingsPoints = Math.max(0, (child.savingsPoints ?? 0) + transferPoints);
      await ChildService.updateChild(child.id, { savingsPoints });
      updateChild(child.id, { savingsPoints });
      if (transferPoints > 0) setShowConfetti(true);
    }

    const updates = archiveAfterComplete
      ? { status: 'archived' as const, completedAt, archivedAt: Date.now() }
      : { status: 'completed' as const, completedAt };
    await CabinetService.updateCabinet(cabinet.id, updates);
    updateCabinet(cabinet.id, updates);
  };

  useEffect(() => {
    if (!cabinet || settings.accessMode !== 'parent') return;
    if (cabinet.status === 'completed' || cabinet.status === 'archived' || cabinet.archivedAt) return;
    if (periodPromptedId === cabinet.id) return;
    if (compareDateStrings(formatDateISO(new Date()), cabinet.endDate) <= 0) return;

    setPeriodPromptedId(cabinet.id);
    Alert.alert(
      text.home.periodFinished,
      tr(text.home.periodFinishedText, { name: cabinet.name, date: cabinet.endDate }),
      [
        { text: text.home.later, style: 'cancel' },
        {
          text: text.home.summarize,
          onPress: async () => {
            const total = activities
              .filter((activity) => activity.cabinetId === cabinet.id)
              .reduce((sum, activity) => sum + activity.points, 0);
            const target = Math.max(cabinet.minPointsForReward ?? cabinet.maxPointsPerPeriod ?? cabinet.maxPointsPerDay ?? 100, 1);
            const reachedTarget = total >= target;
            const currencyText = cabinet.currencyEnabled
              ? `\n${tr(text.home.currencyEstimate, { value: reachedTarget ? Math.round(total * (cabinet.moneyPerPoint ?? 1) * 100) / 100 : 0, symbol: cabinet.currencySymbol })}`
              : '';
            const screenText = `\n${tr(text.home.screenEstimate, { minutes: reachedTarget ? Math.floor(total / Math.max(cabinet.screenPointsPerTenMinutes ?? 10, 1)) * 10 : 0 })}`;
            const closePeriod = (archive: boolean) => {
              if (reachedTarget) {
                completeCurrentPeriod(archive);
                return;
              }
              const quarter = Math.floor(Math.max(total, 0) * 0.25);
              const half = Math.floor(Math.max(total, 0) * 0.5);
              Alert.alert(
                text.home.periodSummary,
                'Порог не набран. Сколько баллов перенести в копилку?',
                [
                  { text: '0', onPress: () => completeCurrentPeriod(archive, 0) },
                  { text: `${quarter}`, onPress: () => completeCurrentPeriod(archive, quarter) },
                  { text: `${half}`, onPress: () => completeCurrentPeriod(archive, half) },
                  { text: `${Math.max(total, 0)}`, onPress: () => completeCurrentPeriod(archive, Math.max(total, 0)) },
                ],
              );
            };
            Alert.alert(
              text.home.periodSummary,
              `${tr(text.home.periodPoints, { total, target })}\n${reachedTarget ? text.home.periodPlanDone : text.home.periodMostlyDone}${currencyText}${screenText}\n\n${text.home.afterPeriodHint}`,
              [
                {
                  text: text.home.finish,
                  onPress: () => closePeriod(false),
                },
                {
                  text: text.home.finishArchive,
                  onPress: () => closePeriod(true),
                },
                { text: text.home.later, style: 'cancel' },
              ]
            );
          },
        },
      ]
    );
  }, [activities, cabinet, periodPromptedId, settings.accessMode, updateCabinet]);

  const greetingName = settings.accessMode === 'child'
    ? child?.name
    : settings.parentName || text.home.parentFallback;

  const handleCategoryPress = (type: 'study' | 'sport' | 'behavior' | 'task') => {
    if (settings.accessMode === 'child') return;
    router.push({ pathname: '/add', params: { tab: type } });
  };

  const handleLevelPress = () => {
    if (!child) return;
    const next = LEVEL_CONFIGS.find((level) => level.level > child.currentLevel);
    if (!next) {
      Alert.alert(text.home.level, text.home.maxLevel);
      return;
    }
    const missing = Math.max(0, next.minPoints - child.totalPoints);
    Alert.alert(text.home.childLevel, tr(text.home.nextLevelHint, { missing, name: next.name }));
  };

  const handleSignOut = async () => {
    await AuthService.signOut();
    signOut();
    router.replace('/auth');
  };

  const applyActivityPointsDelta = async (activity: Activity, nextPoints: number) => {
    if (!child) return;
    const delta = nextPoints - activity.points;
    await ActivityService.updateActivity(activity.id, { points: nextPoints });
    const totalPoints = Math.max(0, (child.totalPoints ?? 0) + delta);
    const currentLevel = getLevelByPoints(totalPoints);
    await ChildService.updateChild(child.id, { totalPoints, currentLevel });
    updateChild(child.id, { totalPoints, currentLevel });
  };

  const handleEditActivity = (activity: Activity) => {
    Alert.alert('Редактировать баллы', `${activity.points > 0 ? '+' : ''}${formatPoints(activity.points)} ${text.common.points}`, [
      { text: '-5', onPress: () => applyActivityPointsDelta(activity, activity.points - 5) },
      { text: '-1', onPress: () => applyActivityPointsDelta(activity, activity.points - 1) },
      { text: '+1', onPress: () => applyActivityPointsDelta(activity, activity.points + 1) },
      { text: '+5', onPress: () => applyActivityPointsDelta(activity, activity.points + 5) },
      { text: text.common.cancel, style: 'cancel' },
    ]);
  };

  const handleDeleteActivity = (activity: Activity) => {
    if (!child) return;
    Alert.alert('Удалить запись?', 'Баллы и статистика будут пересчитаны.', [
      { text: text.common.cancel, style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await ActivityService.deleteActivity(activity.id);
          const totalPoints = Math.max(0, (child.totalPoints ?? 0) - activity.points);
          const currentLevel = getLevelByPoints(totalPoints);
          await ChildService.updateChild(child.id, { totalPoints, currentLevel });
          updateChild(child.id, { totalPoints, currentLevel });
        },
      },
    ]);
  };

  const handleArchiveCurrentCabinet = () => {
    if (!cabinet) return;
    const total = activities
      .filter((activity) => activity.cabinetId === cabinet.id)
      .reduce((sum, activity) => sum + activity.points, 0);
    const positiveTotal = Math.max(0, total);
    const quarter = Math.floor(positiveTotal * 0.25);
    const half = Math.floor(positiveTotal * 0.5);
    Alert.alert('В архив?', 'Кабинет будет доступен в архивной статистике. Сколько баллов перенести в копилку?', [
      { text: text.common.cancel, style: 'cancel' },
      { text: '0', onPress: () => completeCurrentPeriod(true, 0) },
      { text: `${quarter}`, onPress: () => completeCurrentPeriod(true, quarter) },
      { text: `${half}`, onPress: () => completeCurrentPeriod(true, half) },
      { text: `${positiveTotal}`, onPress: () => completeCurrentPeriod(true, positiveTotal) },
    ]);
  };

  if (!child) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <TouchableOpacity style={[styles.emptySettingsButton, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => router.push('/settings')}>
          <Settings size={22} color={palette.textSecondary} />
        </TouchableOpacity>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>{text.home.welcome}</Text>
          <Text style={[styles.emptySubtitle, { color: palette.textSecondary }]}>{text.home.addChildHint}</Text>
          <TouchableOpacity style={[styles.emptyButton, { backgroundColor: palette.primary }]} onPress={() => router.push('/child-new')}>
            <Text style={[styles.emptyButtonText, { color: palette.textInverse }]}>{text.home.addChild}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.emptySignOutButton} onPress={handleSignOut}>
            <LogOut size={18} color={palette.danger} />
            <Text style={[styles.emptySignOutText, { color: palette.danger }]}>{text.home.signOut}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!cabinet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <TouchableOpacity style={[styles.emptySettingsButton, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => router.push('/settings')}>
          <Settings size={22} color={palette.textSecondary} />
        </TouchableOpacity>
        <View style={styles.emptyState}>
          <Card style={styles.emptyCabinetCard}>
            <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>{tr(text.home.greeting, { name: greetingName ?? '' })}</Text>
            <Text style={[styles.emptySubtitle, { color: palette.textSecondary }]}>{tr(text.home.createCabinetHint, { name: child.name })}</Text>
            <View style={[styles.childInfoStrip, { backgroundColor: palette.surfaceVariant }]}>
              <User size={18} color={palette.primary} />
              <Text style={[styles.childInfoText, { color: palette.textSecondary }]} numberOfLines={2}>
                {child.name} · {child.totalPoints ?? 0} {text.common.points} · {child.savingsPoints ?? 0} {text.shop.savings}
              </Text>
            </View>
            <TouchableOpacity style={[styles.emptyButton, { backgroundColor: palette.primary }]} onPress={() => { resetWizard(); router.push({ pathname: '/cabinet-new', params: { fresh: '1' } }); }}>
              <Text style={[styles.emptyButtonText, { color: palette.textInverse }]}>{text.home.createCabinet}</Text>
            </TouchableOpacity>
            {archivedChildCabinets.length > 0 && (
              <View style={styles.copyPickerWrap}>
                <TouchableOpacity
                  style={[styles.copyCabinetButton, { borderColor: palette.border }]}
                  onPress={() => setCopyPickerOpen((value) => !value)}
                >
                  <Copy size={16} color={palette.primary} />
                  <Text style={[styles.copyCabinetText, { color: palette.primary }]} numberOfLines={1}>Создать путём копирования</Text>
                </TouchableOpacity>
                {copyPickerOpen && archivedChildCabinets.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.copyCabinetOption, { borderColor: palette.border }]}
                    onPress={() => {
                      setWizardFromCabinet(item);
                      router.push({ pathname: '/cabinet-new', params: { copy: '1' } });
                    }}
                  >
                    <Text style={[styles.copyCabinetText, { color: palette.primary }]} numberOfLines={1}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>
        </View>
        <ChildSelector children={children} selectedChild={child} onSelectChild={selectChild} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.greeting, { color: palette.textPrimary }]}>{tr(text.home.greeting, { name: greetingName ?? '' })}</Text>
          <Text style={[styles.contextText, { color: palette.textSecondary }]}>
            {settings.accessMode === 'child' ? text.home.childProgress : tr(text.home.parentWorkspace, { name: child.name })}
          </Text>
          <View style={styles.streakRow}>
            <StreakFlame streak={child.currentStreak} size="small" />
            <TouchableOpacity onPress={handleLevelPress} style={styles.levelRow}>
              <Trophy size={14} color={palette.primary} />
              <Text style={[styles.levelText, { color: palette.primary }]}>{tr(text.home.levelShort, { level: child.currentLevel })}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push(settings.accessMode === 'child' ? '/pin' : '/settings')}>
          {settings.accessMode === 'child'
            ? <Lock size={24} color={palette.textSecondary} />
            : <Settings size={24} color={palette.textSecondary} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card variant="elevated" style={styles.pointsCard}>
          <View style={styles.cabinetHeader}>
            <View style={styles.cabinetTitleRow}>
              <View style={styles.cabinetTitleBlock}>
                <Text style={[styles.cabinetName, { color: palette.textPrimary }]} numberOfLines={1}>{cabinet.name}</Text>
                <Text style={[styles.cabinetDates, { color: palette.textSecondary }]}>{normalizeDateDisplay(cabinet.startDate)} - {normalizeDateDisplay(cabinet.endDate)}</Text>
              </View>
              {settings.accessMode === 'parent' && (
                <View style={styles.cabinetActionRow}>
                  <TouchableOpacity style={[styles.cabinetIconButton, { borderColor: palette.border }]} onPress={() => router.push({ pathname: '/cabinet-edit', params: { id: cabinet.id } })}>
                    <Pencil size={15} color={palette.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.cabinetIconButton, { borderColor: palette.border }]} onPress={handleArchiveCurrentCabinet}>
                    <Archive size={15} color={palette.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.cabinetIconButton, { borderColor: palette.border }]} onPress={() => Alert.alert('Удалить кабинет?', 'Кабинет будет удалён полностью и исчезнет из истории и архива. Действие нельзя отменить.', [{ text: text.common.cancel, style: 'cancel' }, { text: 'Удалить', style: 'destructive', onPress: async () => { await CabinetService.hardDeleteCabinet(cabinet.id); removeCabinet(cabinet.id); } }])}>
                    <Trash2 size={15} color={palette.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          <View style={styles.pointsRow}>
            <View style={styles.pointsBlock}>
              <Text style={[styles.pointsLabel, { color: palette.textSecondary }]}>{text.home.available}</Text>
              <View style={styles.pointsValueRow}>
                <Text style={[styles.pointsValue, { color: palette.textPrimary }]}>{child.availablePoints}</Text>
                <Star size={22} color={palette.primary} fill={palette.primary} />
              </View>
            </View>
            <View style={[styles.pointsDivider, { backgroundColor: palette.divider }]} />
            <View style={styles.pointsBlock}>
              <Text style={[styles.pointsLabel, { color: palette.textSecondary }]}>{text.home.savings}</Text>
              <Text style={[styles.pointsValue, { color: palette.success }]}>{child.savingsPoints}</Text>
              <Text style={[styles.pointsHint, { color: palette.textTertiary }]}>{text.home.savingsHint}</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.levelSection, { borderTopColor: palette.divider }]} onPress={handleLevelPress}>
            <LevelBadge level={child.currentLevel} totalPoints={child.totalPoints} showProgress />
          </TouchableOpacity>
          <View style={[styles.progressSection, { borderTopColor: palette.divider }]}>
            <View style={styles.progressLabelRow}>
              <Text style={[styles.progressLabel, { color: palette.textSecondary }]}>{text.home.period}</Text>
              <Text style={[styles.progressValue, { color: palette.textPrimary }]}>{Math.round(periodProgress * 100)}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: palette.surfaceVariant }]}>
              <View style={[styles.progressFill, { width: `${periodProgress * 100}%`, backgroundColor: palette.primary }]} />
            </View>
            <View style={styles.progressLabelRow}>
              <Text style={[styles.progressLabel, { color: palette.textSecondary }]}>{text.home.periodPointsLabel}</Text>
              <Text style={[styles.progressValue, { color: palette.textPrimary }]}>{formatPoints(periodPoints)} / {formatPoints(pointsTarget)}</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: palette.surfaceVariant }]}>
              <View style={[styles.progressFill, { width: `${pointsProgress * 100}%`, backgroundColor: palette.success }]} />
            </View>
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{text.home.categories}</Text>
        <View style={styles.categoriesGrid}>
          <CategoryCard type="study" points={categoryStats.study} count={categoryCounts.study} onPress={() => handleCategoryPress('study')} />
          <CategoryCard type="sport" points={categoryStats.sport} count={categoryCounts.sport} onPress={() => handleCategoryPress('sport')} />
          <CategoryCard type="behavior" points={categoryStats.behavior} count={categoryCounts.behavior} onPress={() => handleCategoryPress('behavior')} />
          <CategoryCard type="task" points={categoryStats.task} count={categoryCounts.task} onPress={() => handleCategoryPress('task')} />
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.quickAction, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => router.push('/daily-quests')}>
            <CalendarCheck size={20} color={palette.primary} />
            <Text style={[styles.quickActionText, { color: palette.textPrimary }]}>{text.home.quests}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickAction, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => router.push('/duels')}>
            <Swords size={20} color={palette.primary} />
            <Text style={[styles.quickActionText, { color: palette.textPrimary }]}>{text.home.duels}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{text.home.recent}</Text>
          <TouchableOpacity onPress={() => router.push('/history')}>
            <Text style={[styles.viewAll, { color: palette.primary }]}>{text.home.viewAll}</Text>
          </TouchableOpacity>
        </View>

        {activities.length === 0 ? (
          <Card style={styles.emptyActivities}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>{loading ? text.home.loading : text.home.noActivities}</Text>
            <Text style={[styles.emptySubtext, { color: palette.textTertiary }]}>{text.home.emptyHint}</Text>
          </Card>
        ) : (
          <Card>
            {activities.slice(0, 5).map((activity) => (
              <ActivityItem key={activity.id} activity={activity} onEdit={settings.accessMode === 'parent' ? handleEditActivity : undefined} onDelete={settings.accessMode === 'parent' ? handleDeleteActivity : undefined} />
            ))}
          </Card>
        )}
      </ScrollView>

      <ChildSelector children={children} selectedChild={child} onSelectChild={selectChild} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerText: { flex: 1, paddingRight: 12 },
  greeting: { fontSize: 22, fontWeight: '800' },
  contextText: { marginTop: 2, fontSize: 13 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  levelText: { fontSize: 13, fontWeight: '700' },
  scrollContent: { padding: 20, gap: 20, paddingBottom: 100 },
  pointsCard: { padding: 20 },
  cabinetHeader: { marginBottom: 14, gap: 2 },
  cabinetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cabinetTitleBlock: { flex: 1, minWidth: 0 },
  cabinetActionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cabinetIconButton: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cabinetName: { fontSize: 17, fontWeight: '900' },
  cabinetDates: { fontSize: 12, fontWeight: '700' },
  pointsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  pointsBlock: { flex: 1, alignItems: 'center', gap: 6 },
  pointsDivider: { width: 1, height: 60 },
  pointsLabel: { fontSize: 13, fontWeight: '600' },
  pointsValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pointsValue: { fontSize: 34, fontWeight: '800' },
  pointsHint: { fontSize: 11, textAlign: 'center' },
  levelSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  progressSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, gap: 8 },
  progressLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  progressLabel: { fontSize: 12, fontWeight: '800' },
  progressValue: { fontSize: 12, fontWeight: '900' },
  progressTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  viewAll: { fontWeight: '700', fontSize: 14 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickActions: { flexDirection: 'row', gap: 10 },
  quickAction: {
    flex: 1,
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  quickActionText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  emptyActivities: { padding: 24, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 15 },
  emptySubtext: { fontSize: 13, textAlign: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
  emptySettingsButton: { position: 'absolute', top: 14, right: 16, zIndex: 5, width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emptyCabinetCard: { width: '100%', maxWidth: 360, alignItems: 'center', gap: 12, padding: 22 },
  childInfoStrip: { width: '100%', minHeight: 42, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  childInfoText: { flex: 1, fontSize: 13, fontWeight: '700' },
  copyPickerWrap: { width: '100%', gap: 8 },
  copyCabinetButton: { width: '100%', minHeight: 40, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  copyCabinetOption: { width: '100%', minHeight: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  copyCabinetText: { fontWeight: '800' },
  emptyTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  emptySubtitle: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
  emptyButton: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  emptyButtonText: { fontWeight: '700', fontSize: 16 },
  emptySignOutButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  emptySignOutText: { fontWeight: '600', fontSize: 15 },
});

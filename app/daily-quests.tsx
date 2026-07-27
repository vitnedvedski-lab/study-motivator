import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CalendarCheck, CheckCircle2, ChevronLeft } from 'lucide-react-native';
import { QUEST_PERIOD_BONUS, QUESTS, QuestPeriod } from '../constants/dailyQuests';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAppText } from '../hooks/useAppText';
import { useChildStore } from '../stores/childStore';
import { ActivityService } from '../services/activityService';
import { Activity } from '../types';
import { compareDateStrings, formatDateISO, parseISODate, shiftDateString } from '../utils/datePeriod';

const COPY = {
  ru: {
    title: 'Квесты',
    periods: { daily: 'День', weekly: 'Неделя', monthly: 'Месяц' },
    doneOf: '{{done}} из {{total}}',
    bonus: 'Бонус периода: +{{points}} баллов',
    points: 'баллов',
    quests: {
      daily_two_grades: 'Добавить 2 оценки',
      daily_sport: 'Отметить спорт',
      daily_behavior: 'Записать поведение',
      weekly_ten_grades: '10 учебных записей за неделю',
      weekly_three_tasks: 'Выполнить 3 задания',
      weekly_positive_behavior: '5 хороших поступков',
      monthly_study_rhythm: '30 учебных записей за месяц',
      monthly_all_rounder: 'Учёба, спорт и задания',
    },
  },
  en: {
    title: 'Quests',
    periods: { daily: 'Day', weekly: 'Week', monthly: 'Month' },
    doneOf: '{{done}} of {{total}}',
    bonus: 'Period bonus: +{{points}} points',
    points: 'points',
    quests: {
      daily_two_grades: 'Add 2 grades',
      daily_sport: 'Record sport',
      daily_behavior: 'Record behavior',
      weekly_ten_grades: '10 study records this week',
      weekly_three_tasks: 'Complete 3 tasks',
      weekly_positive_behavior: '5 good actions',
      monthly_study_rhythm: '30 study records this month',
      monthly_all_rounder: 'Study, sport and tasks',
    },
  },
  zh: {
    title: '任务',
    periods: { daily: '日', weekly: '周', monthly: '月' },
    doneOf: '{{done}} / {{total}}',
    bonus: '周期奖励：+{{points}} 积分',
    points: '积分',
    quests: {
      daily_two_grades: '添加2个成绩',
      daily_sport: '记录运动',
      daily_behavior: '记录行为',
      weekly_ten_grades: '本周10条学习记录',
      weekly_three_tasks: '完成3个任务',
      weekly_positive_behavior: '5个良好行为',
      monthly_study_rhythm: '本月30条学习记录',
      monthly_all_rounder: '学习、运动和任务',
    },
  },
};

const PERIODS: { key: QuestPeriod; days: number }[] = [
  { key: 'daily', days: 1 },
  { key: 'weekly', days: 7 },
  { key: 'monthly', days: 30 },
];

const getAgeGroup = (birthDate?: string): '6-8' | '9-11' | '12-14' | '15-18' => {
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

export default function DailyQuestsScreen() {
  const router = useRouter();
  const palette = useAppTheme();
  const { lang, tr } = useAppText();
  const copy = COPY[lang as keyof typeof COPY] ?? COPY.en;
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const child = useChildStore((state) => state.selectedChild());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [period, setPeriod] = useState<QuestPeriod>('daily');
  const ageGroup = getAgeGroup(child?.birthDate);

  useEffect(() => {
    if (!child) return;
    return ActivityService.subscribeToActivities(child.id, setActivities);
  }, [child?.id]);

  const periodActivities = useMemo(() => {
    const selected = PERIODS.find((item) => item.key === period) ?? PERIODS[0];
    const today = formatDateISO(new Date());
    const start = shiftDateString(today, -(selected.days - 1));
    return activities.filter((activity) => compareDateStrings(activity.date, start) >= 0 && compareDateStrings(activity.date, today) <= 0);
  }, [activities, period]);

  const quests = QUESTS.filter((quest) => quest.period === period && (!quest.ageGroups || quest.ageGroups.includes(ageGroup))).map((quest) => {
    const progress = Math.min(quest.target, quest.getProgress(periodActivities));
    return { ...quest, title: copy.quests[quest.id as keyof typeof copy.quests] ?? quest.title, progress, done: progress >= quest.target };
  });

  const doneCount = quests.filter((quest) => quest.done).length;
  const earnedBonus =
    quests.reduce((sum, quest) => sum + (quest.done ? quest.pointsReward : 0), 0) +
    (quests.length > 0 && doneCount === quests.length ? QUEST_PERIOD_BONUS[period] : 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button title="" onPress={() => router.back()} variant="ghost" icon={<ChevronLeft size={24} color={palette.textPrimary} />} />
        <Text style={styles.headerTitle}>{copy.title}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.periodRow}>
          {PERIODS.map((item) => {
            const active = period === item.key;
            return (
              <TouchableOpacity key={item.key} style={[styles.periodChip, active && styles.periodChipActive]} onPress={() => setPeriod(item.key)}>
                <Text style={[styles.periodText, active && styles.periodTextActive]}>{copy.periods[item.key]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Card style={styles.summaryCard} variant="elevated">
          <View style={styles.summaryIcon}>
            <CalendarCheck size={28} color={palette.primary} />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>{tr(copy.doneOf, { done: doneCount, total: quests.length })}</Text>
            <Text style={styles.summarySubtitle}>{tr(copy.bonus, { points: earnedBonus })}</Text>
          </View>
        </Card>

        {quests.map((quest) => {
          const percent = quest.target === 0 ? 0 : Math.round((quest.progress / quest.target) * 100);
          return (
            <Card key={quest.id} style={styles.questCard}>
              <View style={styles.questHeader}>
                <View style={styles.questTextBlock}>
                  <Text style={styles.questTitle}>{quest.title}</Text>
                  <Text style={styles.questReward}>+{quest.pointsReward} {copy.points}</Text>
                </View>
                {quest.done && <CheckCircle2 size={24} color={palette.success} />}
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(100, percent)}%` }]} />
              </View>
              <Text style={styles.progressText}>{quest.progress} / {quest.target}</Text>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (palette: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: palette.textPrimary },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodChip: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  periodChipActive: { borderColor: palette.primary, backgroundColor: palette.primaryContainer },
  periodText: { fontWeight: '800', color: palette.textSecondary },
  periodTextActive: { color: palette.primary },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
  summaryIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primaryContainer },
  summaryText: { flex: 1 },
  summaryTitle: { fontSize: 24, fontWeight: '800', color: palette.textPrimary },
  summarySubtitle: { marginTop: 4, color: palette.textSecondary, fontSize: 14 },
  questCard: { padding: 16, gap: 12 },
  questHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  questTextBlock: { flex: 1, minWidth: 0 },
  questTitle: { fontSize: 16, fontWeight: '700', color: palette.textPrimary },
  questReward: { marginTop: 3, color: palette.primary, fontWeight: '700' },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: palette.surfaceVariant, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: palette.primary },
  progressText: { color: palette.textSecondary, fontSize: 13, fontWeight: '600' },
});

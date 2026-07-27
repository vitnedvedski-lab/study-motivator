import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Crown, Swords, Trophy, Users, XCircle } from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DateInput } from '../components/DateInput';
import { Input } from '../components/ui/Input';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ActivityService } from '../services/activityService';
import { useCabinetStore } from '../stores/cabinetStore';
import { useChildStore } from '../stores/childStore';
import { useUIStore } from '../stores/uiStore';
import { useAppText } from '../hooks/useAppText';
import { useAppTheme } from '../hooks/useAppTheme';
import { Activity } from '../types';
import { compareDateStrings, formatDateISO, normalizeDateDisplay } from '../utils/datePeriod';

type DuelGoal = 'points' | 'streak';

interface DuelParticipant {
  id: string;
  name: string;
  confirmedDeactivate: boolean;
}

interface ActiveDuel {
  id: string;
  childId: string;
  cabinetId: string;
  goal: DuelGoal;
  title: string;
  participants: DuelParticipant[];
  startDate: string;
  endDate: string;
  target: number;
  active: boolean;
  completedAt?: number;
  createdAt: number;
}

const STORAGE_KEY = 'study-motivator-duels-v3';

const EXTRA = {
  ru: {
    titlePlaceholder: 'Например: неделя математики',
    target: 'Цель',
    targetHint: 'Сколько баллов или дней серии нужно набрать',
    participantsHint: 'Имена участников',
    participantName: 'Имя участника {{number}}',
    addParticipant: 'Добавить участника',
    removeParticipant: 'Убрать',
    invalidTitle: 'Введите название дуэли.',
    invalidTarget: 'Цель должна быть больше 0.',
    invalidParticipants: 'Добавьте хотя бы одного участника кроме ребёнка.',
    winner: 'Цель достигнута',
    inProgress: 'В процессе',
    childCreatorOnly: 'Создание доступно ребёнку. Родитель видит ход и завершает дуэль.',
  },
  en: {
    titlePlaceholder: 'Example: math week',
    target: 'Goal',
    targetHint: 'How many points or streak days are needed',
    participantsHint: 'Participant names',
    participantName: 'Participant {{number}} name',
    addParticipant: 'Add participant',
    removeParticipant: 'Remove',
    invalidTitle: 'Enter a duel title.',
    invalidTarget: 'Goal must be greater than 0.',
    invalidParticipants: 'Add at least one participant besides the child.',
    winner: 'Goal reached',
    inProgress: 'In progress',
    childCreatorOnly: 'Creation is available to the child. The parent monitors and finishes the duel.',
  },
  zh: {
    titlePlaceholder: '例如：数学周',
    target: '目标',
    targetHint: '需要多少积分或连续天数',
    participantsHint: '参与者姓名',
    participantName: '参与者 {{number}} 姓名',
    addParticipant: '添加参与者',
    removeParticipant: '移除',
    invalidTitle: '请输入对决名称。',
    invalidTarget: '目标必须大于0。',
    invalidParticipants: '请至少添加一个孩子以外的参与者。',
    winner: '已达到目标',
    inProgress: '进行中',
    childCreatorOnly: '创建由孩子操作。家长查看进度并结束对决。',
  },
};

const readDuels = async (): Promise<ActiveDuel[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ActiveDuel[];
  } catch {
    return [];
  }
};

const writeDuels = async (duels: ActiveDuel[]) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(duels));
};

export default function DuelsScreen() {
  const router = useRouter();
  const { selectedChild } = useChildStore();
  const { activeCabinet } = useCabinetStore();
  const { settings } = useUIStore();
  const { text, tr, lang } = useAppText();
  const extra = EXTRA[lang as keyof typeof EXTRA] ?? EXTRA.en;
  const palette = useAppTheme();
  const child = selectedChild();
  const cabinet = activeCabinet();
  const isPremium = settings.subscription === 'premium';
  const isChildMode = settings.accessMode === 'child';
  const [duels, setDuels] = useState<ActiveDuel[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [goal, setGoal] = useState<DuelGoal>('points');
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('50');
  const [participantNames, setParticipantNames] = useState(['']);
  const [startDate, setStartDate] = useState(formatDateISO(new Date()));
  const [endDate, setEndDate] = useState(formatDateISO(new Date()));

  useEffect(() => {
    readDuels().then(setDuels);
  }, []);

  useEffect(() => {
    if (!child) return;
    return ActivityService.subscribeToActivities(child.id, setActivities);
  }, [child?.id]);

  useEffect(() => {
    if (!cabinet) return;
    const today = formatDateISO(new Date());
    const safeStart = compareDateStrings(today, cabinet.startDate) < 0 ? cabinet.startDate : today;
    setStartDate(safeStart);
    setEndDate(compareDateStrings(safeStart, cabinet.endDate) > 0 ? cabinet.endDate : safeStart);
  }, [cabinet?.id, cabinet?.startDate, cabinet?.endDate]);

  const visibleDuels = useMemo(() => {
    if (!child || !cabinet) return [];
    return duels.filter((duel) => duel.childId === child.id && duel.cabinetId === cabinet.id);
  }, [duels, child?.id, cabinet?.id]);

  const saveDuels = async (next: ActiveDuel[]) => {
    setDuels(next);
    await writeDuels(next);
  };

  const createDuel = async () => {
    if (!child || !cabinet) return;
    const cleanTitle = title.trim();
    const cleanNames = participantNames.map((name) => name.trim()).filter(Boolean);
    const numericTarget = parseInt(target, 10) || 0;
    if (!cleanTitle) {
      Alert.alert(text.duels.title, extra.invalidTitle);
      return;
    }
    if (numericTarget <= 0) {
      Alert.alert(text.duels.title, extra.invalidTarget);
      return;
    }
    if (cleanNames.length === 0) {
      Alert.alert(text.duels.title, extra.invalidParticipants);
      return;
    }
    if (compareDateStrings(startDate, cabinet.startDate) < 0 || compareDateStrings(endDate, cabinet.endDate) > 0 || compareDateStrings(endDate, startDate) < 0) {
      Alert.alert(text.duels.title, text.duels.periodError);
      return;
    }

    const participants: DuelParticipant[] = [
      { id: child.id, name: child.name, confirmedDeactivate: false },
      ...cleanNames.map((name, index) => ({
        id: `friend_${Date.now()}_${index}`,
        name,
        confirmedDeactivate: false,
      })),
    ];

    const nextDuel: ActiveDuel = {
      id: `duel_${Date.now()}`,
      childId: child.id,
      cabinetId: cabinet.id,
      goal,
      title: cleanTitle,
      participants,
      startDate,
      endDate,
      target: numericTarget,
      active: true,
      createdAt: Date.now(),
    };

    await saveDuels([nextDuel, ...duels]);
    setTitle('');
    setTarget(goal === 'points' ? '50' : '5');
    setParticipantNames(['']);
    Alert.alert(text.duels.created, text.duels.createdText);
  };

  const completeDuel = (duel: ActiveDuel) => {
    Alert.alert(text.duels.completeTitle, text.duels.completeText, [
      { text: text.common.cancel, style: 'cancel' },
      {
        text: text.duels.complete,
        onPress: async () => {
          const next = duels.map((item) =>
            item.id === duel.id ? { ...item, active: false, completedAt: Date.now() } : item
          );
          await saveDuels(next);
        },
      },
    ]);
  };

  const confirmDeactivate = async (duel: ActiveDuel, participantId: string) => {
    const next = duels.map((item) => {
      if (item.id !== duel.id) return item;
      const participants = item.participants.map((participant) =>
        participant.id === participantId ? { ...participant, confirmedDeactivate: true } : participant
      );
      const active = !participants.every((participant) => participant.confirmedDeactivate);
      return { ...item, participants, active, completedAt: active ? item.completedAt : Date.now() };
    });
    await saveDuels(next);
  };

  const getDuelProgress = (duel: ActiveDuel) => {
    if (!child) return 0;
    if (duel.goal === 'streak') return child.currentStreak;
    return activities
      .filter((activity) =>
        activity.cabinetId === duel.cabinetId &&
        compareDateStrings(activity.date, duel.startDate) >= 0 &&
        compareDateStrings(activity.date, duel.endDate) <= 0
      )
      .reduce((sum, activity) => sum + Math.max(activity.points, 0), 0);
  };

  const renderDuel = (duel: ActiveDuel) => {
    const childValue = getDuelProgress(duel);
    const progress = Math.min(1, childValue / Math.max(duel.target, 1));
    const confirmedCount = duel.participants.filter((participant) => participant.confirmedDeactivate).length;
    const reached = childValue >= duel.target;

    return (
      <Card key={duel.id} style={styles.duelCard}>
        <View style={styles.duelHeader}>
          <View style={styles.duelTitleBlock}>
            <Text style={[styles.duelTitle, { color: palette.textPrimary }]}>{duel.title || text.duels.duelFallback}</Text>
            <Text style={[styles.duelMeta, { color: palette.textSecondary }]}>
              {normalizeDateDisplay(duel.startDate)} - {normalizeDateDisplay(duel.endDate)} · {duel.participants.length}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: duel.active ? palette.successContainer : palette.surfaceVariant }]}>
            <Text style={[styles.statusText, { color: duel.active ? palette.success : palette.textSecondary }]}>
              {duel.active ? text.duels.active : text.duels.finished}
            </Text>
          </View>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: palette.textPrimary }]}>{reached ? extra.winner : extra.inProgress}</Text>
            <Text style={[styles.progressValue, { color: palette.primary }]}>{childValue}/{duel.target}</Text>
          </View>
          <ProgressBar progress={progress} color={reached ? palette.success : palette.primary} height={8} />
        </View>

        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{text.duels.participants}</Text>
        {duel.participants.map((participant, index) => (
          <View key={participant.id} style={styles.participantRow}>
            <View style={styles.place}>
              {index === 0 ? <Trophy size={15} color={palette.primary} /> : <Users size={15} color={palette.textTertiary} />}
              <Text style={[styles.participantName, { color: palette.textPrimary }]} numberOfLines={1}>{participant.name}</Text>
            </View>
            <Text style={[styles.confirmText, { color: participant.confirmedDeactivate ? palette.success : palette.textTertiary }]}>
              {participant.confirmedDeactivate ? text.duels.agreed : text.duels.activeStatus}
            </Text>
          </View>
        ))}

        {duel.active && (
          <View style={styles.deactivateBox}>
            <Text style={[styles.hintText, { color: palette.textSecondary }]}>
              {tr(text.duels.deactivateHint, { count: confirmedCount, total: duel.participants.length })}
            </Text>
            {isChildMode ? (
              <Button
                title={text.duels.confirmDisable}
                onPress={() => confirmDeactivate(duel, child?.id ?? duel.participants[0].id)}
                variant="outline"
                icon={<XCircle size={17} color={palette.primary} />}
              />
            ) : (
              <Button title={text.duels.complete} onPress={() => completeDuel(duel)} variant="outline" />
            )}
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.header}>
        <Button title="" onPress={() => router.back()} variant="ghost" icon={<ChevronLeft size={24} color={palette.textPrimary} />} />
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>{text.duels.title}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!isPremium ? (
          <Card style={styles.lockedCard} variant="elevated">
            <Crown size={34} color={palette.primary} />
            <Text style={[styles.lockTitle, { color: palette.textPrimary }]}>{text.duels.premiumTitle}</Text>
            <Text style={[styles.hintText, { color: palette.textSecondary }]}>{text.duels.premiumText}</Text>
            <Button title={text.duels.settings} onPress={() => router.push('/settings')} />
          </Card>
        ) : !child || !cabinet ? (
          <Card style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>{text.duels.noChildCabinet}</Text>
          </Card>
        ) : (
          <>
            <Card style={styles.heroCard} variant="elevated">
              <Swords size={30} color={palette.primary} />
              <View style={styles.heroText}>
                <Text style={[styles.heroTitle, { color: palette.textPrimary }]}>
                  {isChildMode ? text.duels.childHero : text.duels.parentHero}
                </Text>
                <Text style={[styles.hintText, { color: palette.textSecondary }]}>
                  {isChildMode ? text.duels.childHint : text.duels.parentHint}
                </Text>
              </View>
            </Card>

            {isChildMode ? (
              <Card style={styles.builderCard}>
                <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{text.duels.newDuel}</Text>
                <Input label={text.duels.duelFallback} value={title} onChangeText={setTitle} placeholder={extra.titlePlaceholder} />
                <DateInput label={text.duels.startDate} value={startDate} onChange={setStartDate} />
                <DateInput label={text.duels.endDate} value={endDate} onChange={setEndDate} />
                <Text style={[styles.hintText, { color: palette.textSecondary }]}>
                  {tr(text.duels.periodHint, { start: normalizeDateDisplay(cabinet.startDate), end: normalizeDateDisplay(cabinet.endDate) })}
                </Text>
                <View style={styles.choiceRow}>
                  {(['points', 'streak'] as DuelGoal[]).map((item) => {
                    const active = goal === item;
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[styles.choice, { borderColor: active ? palette.primary : palette.border, backgroundColor: active ? palette.primaryContainer : palette.surface }]}
                        onPress={() => {
                          setGoal(item);
                          setTarget(item === 'points' ? '50' : '5');
                        }}
                      >
                        <Text style={[styles.choiceText, { color: active ? palette.primary : palette.textPrimary }]}>{item === 'points' ? text.duels.pointsGoal : text.duels.streakGoal}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Input label={extra.target} value={target} onChangeText={(value) => setTarget(value.replace(/[^\d]/g, '').slice(0, 5))} keyboardType="numeric" />
                <Text style={[styles.hintText, { color: palette.textSecondary }]}>{extra.targetHint}</Text>
                <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{extra.participantsHint}</Text>
                {participantNames.map((name, index) => (
                  <View key={index} style={styles.participantInputRow}>
                    <Input
                      value={name}
                      onChangeText={(value) => setParticipantNames((items) => items.map((item, itemIndex) => itemIndex === index ? value : item))}
                      placeholder={tr(extra.participantName, { number: index + 2 })}
                      style={styles.participantInput}
                    />
                    {participantNames.length > 1 && (
                      <TouchableOpacity style={[styles.removeButton, { borderColor: palette.border }]} onPress={() => setParticipantNames((items) => items.filter((_, itemIndex) => itemIndex !== index))}>
                        <Text style={[styles.removeText, { color: palette.danger }]}>{extra.removeParticipant}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <Button title={extra.addParticipant} onPress={() => setParticipantNames((items) => [...items, ''])} variant="outline" />
                <Button title={text.duels.create} onPress={createDuel} size="large" />
              </Card>
            ) : (
              <Card style={styles.builderCard}>
                <Text style={[styles.hintText, { color: palette.textSecondary }]}>{extra.childCreatorOnly}</Text>
              </Card>
            )}

            {visibleDuels.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                  {isChildMode ? text.duels.noDuelsChild : text.duels.noDuelsParent}
                </Text>
              </Card>
            ) : (
              visibleDuels.map(renderDuel)
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  lockedCard: { alignItems: 'center', padding: 24, gap: 12 },
  lockTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
  heroText: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 22, fontWeight: '800' },
  hintText: { fontSize: 13, lineHeight: 18 },
  builderCard: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 40, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontWeight: '800' },
  participantInputRow: { gap: 8 },
  participantInput: { marginBottom: 0 },
  removeButton: { minHeight: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontWeight: '800' },
  duelCard: { padding: 16, gap: 14 },
  duelHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  duelTitleBlock: { flex: 1, minWidth: 0 },
  duelTitle: { fontSize: 18, fontWeight: '800' },
  duelMeta: { marginTop: 4, fontSize: 12, fontWeight: '600' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '800' },
  progressBlock: { gap: 7 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  progressLabel: { fontWeight: '700' },
  progressValue: { fontWeight: '800' },
  participantRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  place: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 },
  participantName: { fontWeight: '700' },
  confirmText: { fontSize: 12, fontWeight: '800' },
  deactivateBox: { gap: 10 },
  emptyCard: { padding: 24, alignItems: 'center' },
  emptyText: { textAlign: 'center' },
});

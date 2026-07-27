import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Archive, BookOpen, CalendarDays, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Dumbbell, Smile } from 'lucide-react-native';
import { ActivityItem } from '../../components/ActivityItem';
import { Card } from '../../components/ui/Card';
import { DateInput } from '../../components/DateInput';
import { useAppText } from '../../hooks/useAppText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { ActivityService } from '../../services/activityService';
import { StatsService } from '../../services/statsService';
import { useCabinetStore } from '../../stores/cabinetStore';
import { useChildStore } from '../../stores/childStore';
import { Activity, ActivityType } from '../../types';
import { compareDateStrings, formatDateISO, normalizeDateDisplay, shiftDateString } from '../../utils/datePeriod';

type FilterType = 'all' | ActivityType;
type RangeMode = 'day' | 'week' | 'month' | 'current' | 'archive' | 'all';
type GroupedActivities = Record<string, Activity[]>;

const FILTERS: { key: FilterType; labelKey: keyof ReturnType<typeof useAppText>['text']['history']['filters']; icon: any }[] = [
  { key: 'all', labelKey: 'all', icon: Clock },
  { key: 'study', labelKey: 'study', icon: BookOpen },
  { key: 'sport', labelKey: 'sport', icon: Dumbbell },
  { key: 'behavior', labelKey: 'behavior', icon: Smile },
  { key: 'task', labelKey: 'task', icon: CheckSquare },
];

const RANGE_KEYS: RangeMode[] = ['day', 'week', 'month', 'current', 'all'];
const RANGE_FALLBACK: Record<RangeMode, Record<string, string>> = {
  day: { ru: 'День', en: 'Day', zh: 'Day', fr: 'Jour', de: 'Tag', it: 'Giorno', es: 'Dia' },
  week: { ru: 'Неделя', en: 'Week', zh: 'Week', fr: 'Semaine', de: 'Woche', it: 'Settimana', es: 'Semana' },
  month: { ru: 'Месяц', en: 'Month', zh: 'Month', fr: 'Mois', de: 'Monat', it: 'Mese', es: 'Mes' },
  current: { ru: 'Текущий период', en: 'Current period', zh: 'Current period', fr: 'Periode actuelle', de: 'Aktueller Zeitraum', it: 'Periodo corrente', es: 'Periodo actual' },
  archive: { ru: 'Архив', en: 'Archive', zh: 'Archive', fr: 'Archive', de: 'Archiv', it: 'Archivio', es: 'Archivo' },
  all: { ru: 'Все даты', en: 'All dates', zh: 'All dates', fr: 'Toutes', de: 'Alle', it: 'Tutte', es: 'Todas' },
};

export default function HistoryScreen() {
  const { selectedChild } = useChildStore();
  const { activeCabinet, cabinets } = useCabinetStore();
  const { text, lang } = useAppText();
  const palette = useAppTheme();
  const child = selectedChild();
  const cabinet = activeCabinet();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [rangeMode, setRangeMode] = useState<RangeMode>('week');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showExactDates, setShowExactDates] = useState(false);
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);

  const childCabinets = useMemo(() => cabinets.filter((item) => item.childId === child?.id), [cabinets, child?.id]);
  const archivedCabinets = useMemo(
    () => childCabinets
      .filter((item) => item.status === 'archived' || !!item.archivedAt)
      .sort((a, b) => compareDateStrings(b.startDate, a.startDate)),
    [childCabinets],
  );

  useEffect(() => {
    if (!child) return;
    return ActivityService.subscribeToActivities(child.id, setActivities);
  }, [child?.id]);

  useEffect(() => {
    applyRange('week');
  }, [cabinet?.id]);

  const localizedRange = (key: RangeMode) => RANGE_FALLBACK[key][lang] ?? RANGE_FALLBACK[key].en;

  const clampToToday = (date: string) => {
    const today = formatDateISO(new Date());
    return compareDateStrings(date, today) > 0 ? today : date;
  };

  const applyRange = (mode: RangeMode, anchor = toDate || formatDateISO(new Date())) => {
    setRangeMode(mode);
    setSelectedArchiveId(mode === 'archive' ? selectedArchiveId : null);
    setArchiveOpen(false);
    setRangePickerOpen(false);
    setShowExactDates(false);
    if (mode === 'all') {
      setFromDate('');
      setToDate('');
      return;
    }
    if (mode === 'current' && cabinet) {
      setFromDate(cabinet.startDate);
      setToDate(clampToToday(cabinet.endDate));
      return;
    }
    const safeAnchor = clampToToday(anchor);
    const days = mode === 'month' ? 30 : mode === 'week' ? 7 : 1;
    setFromDate(shiftDateString(safeAnchor, -(days - 1)));
    setToDate(safeAnchor);
  };

  const shiftRange = (delta: number) => {
    if (!['day', 'week', 'month'].includes(rangeMode)) return;
    const step = rangeMode === 'month' ? 30 : rangeMode === 'week' ? 7 : 1;
    const nextTo = clampToToday(shiftDateString(toDate || formatDateISO(new Date()), delta * step));
    applyRange(rangeMode, nextTo);
  };

  const applyArchivePeriod = (cabinetId: string) => {
    const selected = archivedCabinets.find((item) => item.id === cabinetId);
    if (!selected) return;
    setRangeMode('archive');
    setSelectedArchiveId(selected.id);
    setFromDate(selected.startDate);
    setToDate(selected.endDate);
    setArchiveOpen(false);
  };

  const rangeLabel = fromDate && toDate && fromDate !== toDate
    ? `${fromDate} - ${toDate}`
    : fromDate || toDate || text.history.allDates;

  const grouped = useMemo(() => {
    const filtered = activities.filter((activity) => {
      const byType = activeFilter === 'all' || activity.type === activeFilter;
      const byFrom = !fromDate || compareDateStrings(activity.date, fromDate) >= 0;
      const byTo = !toDate || compareDateStrings(activity.date, toDate) <= 0;
      return byType && byFrom && byTo;
    });

    const nextGrouped: GroupedActivities = {};
    filtered.forEach((activity) => {
      if (!nextGrouped[activity.date]) nextGrouped[activity.date] = [];
      nextGrouped[activity.date].push(activity);
    });

    const sortedGrouped: GroupedActivities = {};
    Object.keys(nextGrouped)
      .sort((a, b) => compareDateStrings(b, a))
      .forEach((date) => {
        sortedGrouped[date] = nextGrouped[date];
      });
    return sortedGrouped;
  }, [activities, activeFilter, fromDate, toDate]);

  const getDateLabel = (dateStr: string): string => {
    const today = formatDateISO(new Date());
    const yesterday = shiftDateString(today, -1);
    if (dateStr === today) return text.history.today;
    if (dateStr === yesterday) return text.history.yesterday;
    return StatsService.formatDate(dateStr, 'dd-MM-yyyy');
  };

  if (!child) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>{text.common.noChildCabinet}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.topBlock}>
        <Text style={[styles.title, { color: palette.textPrimary }]}>{text.history.title}</Text>
        <View style={styles.rangeLine}>
          <TouchableOpacity style={[styles.arrowButton, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => shiftRange(-1)}>
            <ChevronLeft size={18} color={palette.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.currentDateButton, { backgroundColor: palette.primaryContainer, borderColor: palette.primary }]}
            onPress={() => setShowExactDates((value) => !value)}
          >
            <Text style={[styles.currentDateText, { color: palette.primary }]} numberOfLines={1}>{rangeLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.arrowButton, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => shiftRange(1)}>
            <ChevronRight size={18} color={palette.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.selectorRow}>
          <View style={styles.rangeSelectorWrap}>
            <TouchableOpacity
              style={[styles.rangeSelector, { backgroundColor: palette.surface, borderColor: palette.border }]}
              onPress={() => setRangePickerOpen((value) => !value)}
            >
              <Text style={[styles.quickText, { color: palette.textPrimary }]} numberOfLines={1}>{localizedRange(rangeMode === 'archive' ? 'current' : rangeMode)}</Text>
              {rangePickerOpen ? <ChevronDown size={18} color={palette.primary} /> : <ChevronUp size={18} color={palette.primary} />}
            </TouchableOpacity>
            {rangePickerOpen && (
              <View style={[styles.rangeMenu, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                {RANGE_KEYS.map((item) => {
                  const active = rangeMode === item;
                  return (
                    <TouchableOpacity key={item} style={styles.rangeOption} onPress={() => applyRange(item)}>
                      <Text style={[styles.quickText, { color: active ? palette.primary : palette.textPrimary }]} numberOfLines={1}>{localizedRange(item)}</Text>
                      {active && <CheckSquare size={15} color={palette.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
          <TouchableOpacity style={[styles.iconQuickButton, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => setShowExactDates((value) => !value)}>
            <CalendarDays size={16} color={palette.primary} />
          </TouchableOpacity>
          {archivedCabinets.length > 0 && (
            <TouchableOpacity
              style={[styles.iconQuickButton, { backgroundColor: palette.surface, borderColor: archiveOpen ? palette.primary : palette.border }]}
              onPress={() => setArchiveOpen((value) => !value)}
            >
              <Archive size={16} color={palette.primary} />
            </TouchableOpacity>
          )}
        </View>

        {archiveOpen && archivedCabinets.length > 0 && (
          <View style={[styles.archiveMenu, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            {archivedCabinets.map((item) => (
              <TouchableOpacity key={item.id} style={styles.archiveOption} onPress={() => applyArchivePeriod(item.id)}>
                <Text style={[styles.archiveName, { color: palette.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.archiveDates, { color: palette.textSecondary }]} numberOfLines={1}>{normalizeDateDisplay(item.startDate)} - {normalizeDateDisplay(item.endDate)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {showExactDates && (
          <View style={styles.dateRow}>
            <DateInput label={text.history.from} value={fromDate} onChange={setFromDate} style={styles.dateInput} />
            <DateInput label={text.history.to} value={toDate} onChange={setToDate} style={styles.dateInput} />
          </View>
        )}

      </View>

      <View style={styles.filtersContainer}>
        {FILTERS.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                { backgroundColor: palette.surface, borderColor: palette.border },
                isActive && { backgroundColor: palette.primaryContainer, borderColor: palette.primary },
              ]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Icon size={15} color={isActive ? palette.primary : palette.textTertiary} />
              <Text style={[styles.filterText, { color: isActive ? palette.primary : palette.textSecondary }, isActive && styles.filterTextActive]} numberOfLines={1}>
                {text.history.filters[filter.labelKey]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {Object.keys(grouped).length === 0 ? (
          <Card style={styles.emptyCard}>
            <Clock size={48} color={palette.textTertiary} />
            <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>{text.history.empty}</Text>
          </Card>
        ) : (
          Object.entries(grouped).map(([date, dayActivities]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={[styles.dateLabel, { color: palette.textSecondary }]}>{getDateLabel(date)}</Text>
              <Card>
                {dayActivities.map((activity, index) => (
                  <View key={activity.id}>
                    <ActivityItem activity={activity} showDate={false} />
                    {index < dayActivities.length - 1 && <View style={[styles.divider, { backgroundColor: palette.divider }]} />}
                  </View>
                ))}
              </Card>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBlock: { paddingHorizontal: 16, paddingTop: 10, gap: 8, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: '800' },
  rangeLine: { flexDirection: 'row', gap: 8 },
  selectorRow: { flexDirection: 'row', gap: 8, zIndex: 3 },
  rangeSelectorWrap: { flex: 1, position: 'relative', zIndex: 4 },
  rangeSelector: { minHeight: 38, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rangeMenu: { position: 'absolute', top: 44, left: 0, right: 0, borderWidth: 1, borderRadius: 10, overflow: 'hidden', zIndex: 5 },
  rangeOption: { minHeight: 38, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickButton: { minHeight: 34, justifyContent: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, maxWidth: '48%' },
  iconQuickButton: { width: 36, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1 },
  arrowButton: { width: 42, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1 },
  currentDateButton: { flex: 1, minWidth: 0, minHeight: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 10 },
  currentDateText: { fontSize: 13, fontWeight: '800' },
  quickText: { fontSize: 12, fontWeight: '800' },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1 },
  archiveMenu: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', zIndex: 3 },
  archiveOption: { minHeight: 50, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  archiveName: { fontSize: 13, fontWeight: '800' },
  archiveDates: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  filtersContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 6, paddingBottom: 12, paddingTop: 8 },
  filterChip: { height: 36, minWidth: 86, flexGrow: 1, flexBasis: '30%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 },
  filterText: { fontWeight: '700', fontSize: 12 },
  filterTextActive: { fontWeight: '800' },
  listContent: { padding: 20, paddingTop: 8, paddingBottom: 100 },
  dateGroup: { marginBottom: 16 },
  dateLabel: { fontSize: 13, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase' },
  divider: { height: 1, marginLeft: 60 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  emptyCard: { alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
});

import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Award, BarChart3, Calendar, Check, ChevronDown, TrendingUp, Zap } from 'lucide-react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { Card } from '../../components/ui/Card';
import { DateInput } from '../../components/DateInput';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useAppText } from '../../hooks/useAppText';
import { ActivityService } from '../../services/activityService';
import { StatsService } from '../../services/statsService';
import { useCabinetStore } from '../../stores/cabinetStore';
import { useChildStore } from '../../stores/childStore';
import { Activity, ActivityType } from '../../types';
import { compareDateStrings, formatDateISO, normalizeDateDisplay, shiftDateString } from '../../utils/datePeriod';
import { formatPoints } from '../../utils/gradeScoring';
import { getLocalizedSubjectName, getSubjectDisplayName } from '../../utils/subjects';

type PeriodType = 'week' | 'month' | 'quarter' | 'year';
type GradePeriodType = 'day' | PeriodType | 'custom';

const PERIODS: { key: PeriodType; labelKey: PeriodType; days: number }[] = [
  { key: 'week', labelKey: 'week', days: 7 },
  { key: 'month', labelKey: 'month', days: 30 },
  { key: 'quarter', labelKey: 'quarter', days: 90 },
  { key: 'year', labelKey: 'year', days: 365 },
];

const GRADE_PERIODS: { key: GradePeriodType; labelKey: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'; days?: number }[] = [
  { key: 'day', labelKey: 'day', days: 1 },
  { key: 'week', labelKey: 'week', days: 7 },
  { key: 'month', labelKey: 'month', days: 30 },
  { key: 'quarter', labelKey: 'quarter', days: 90 },
  { key: 'year', labelKey: 'year', days: 365 },
  { key: 'custom', labelKey: 'custom' },
];

const STATS_COPY = {
  ru: {
    periods: { week: '7 дней', month: '30 дней', quarter: '90 дней', year: 'Год' },
    categories: { study: 'Учёба', sport: 'Спорт', behavior: 'Поведение', task: 'Задания' },
    title: 'Статистика',
    range: 'Период',
    allSubjects: 'Все предметы',
    subjectFallback: 'Предмет',
    pointsEarned: 'Баллов заработано',
    averagePerDay: 'В среднем/день',
    activities: 'Активностей',
    bestDay: 'Лучший день',
    pointsDynamics: 'Динамика баллов',
    categoryDistribution: 'Распределение по категориям',
    noData: 'Нет данных за выбранный период',
    points: 'баллов',
    addChild: 'Сначала добавьте ребёнка',
    gradeStats: 'Статистика оценок',
    grades: 'оценок',
    average: 'средняя',
    best: 'лучшая',
    noGrades: 'Оценок за выбранный период пока нет',
    category: 'Категория',
    recommendations: 'Рекомендации к концу периода',
    noRecommendations: 'Появятся после нескольких оценок по предметам.',
    raiseCategory: '{{name}}: средняя оценка {{grade}}. Лучше поднять категорию до A/B и усилить фокус в следующем периоде.',
    lowerCategory: '{{name}}: идёт уверенно. Можно снизить категорию до B и перенести фокус на более слабый предмет.',
    keepCategory: '{{name}}: оставить категорию {{category}} и наблюдать динамику.',
  },
  en: {
    periods: { week: '7 days', month: '30 days', quarter: '90 days', year: 'Year' },
    categories: { study: 'Study', sport: 'Sport', behavior: 'Behavior', task: 'Tasks' },
    title: 'Stats',
    range: 'Period',
    allSubjects: 'All subjects',
    subjectFallback: 'Subject',
    pointsEarned: 'Points earned',
    averagePerDay: 'Average/day',
    activities: 'Activities',
    bestDay: 'Best day',
    pointsDynamics: 'Points dynamics',
    categoryDistribution: 'Category distribution',
    noData: 'No data for the selected period',
    points: 'points',
    addChild: 'Add a child first',
    gradeStats: 'Grade stats',
    grades: 'grades',
    average: 'average',
    best: 'best',
    noGrades: 'No grades for the selected period yet',
    category: 'Category',
    recommendations: 'End-period recommendations',
    noRecommendations: 'They will appear after several subject grades.',
    raiseCategory: '{{name}}: average grade {{grade}}. Raise the category to A/B and increase focus next period.',
    lowerCategory: '{{name}}: steady progress. You can lower the category to B and shift focus to a weaker subject.',
    keepCategory: '{{name}}: keep category {{category}} and watch the trend.',
  },
  zh: {
    periods: { week: '7天', month: '30天', quarter: '90天', year: '年' },
    categories: { study: '学习', sport: '运动', behavior: '行为', task: '任务' },
    title: '统计',
    range: '周期',
    allSubjects: '所有科目',
    subjectFallback: '科目',
    pointsEarned: '获得积分',
    averagePerDay: '日均',
    activities: '活动',
    bestDay: '最佳日',
    pointsDynamics: '积分趋势',
    categoryDistribution: '分类分布',
    noData: '所选周期暂无数据',
    points: '积分',
    addChild: '请先添加孩子',
    gradeStats: '成绩统计',
    grades: '成绩',
    average: '平均',
    best: '最佳',
    noGrades: '所选周期暂无成绩',
    category: '类别',
    recommendations: '周期末建议',
    noRecommendations: '多个科目成绩后会显示建议。',
    raiseCategory: '{{name}}：平均成绩 {{grade}}。建议提高到 A/B 类并在下周期加强关注。',
    lowerCategory: '{{name}}：表现稳定。可降到 B 类，把重点转向较弱科目。',
    keepCategory: '{{name}}：保持 {{category}} 类并继续观察趋势。',
  },
};

const { width: SCREEN_W } = Dimensions.get('window');

const getActivityGradeValue = (activity: Activity) => {
  if (typeof activity.grade === 'number') return activity.grade;
  const numeric = Number(activity.gradeLabel);
  return Number.isFinite(numeric) ? numeric : null;
};

const shortDateLabel = (date: string) => date.slice(0, 5);
const SCOPE_LABELS: Record<string, { all: string; studyAll: string }> = {
  ru: { all: 'Все', studyAll: 'Все учебные предметы' },
  en: { all: 'All', studyAll: 'All study subjects' },
  zh: { all: '全部', studyAll: '所有学习科目' },
  fr: { all: 'Tout', studyAll: 'Toutes les matieres' },
  de: { all: 'Alle', studyAll: 'Alle Schulfacher' },
  it: { all: 'Tutto', studyAll: 'Tutte le materie' },
  es: { all: 'Todo', studyAll: 'Todas las materias' },
};

export default function StatsScreen() {
  const { cabinetId } = useLocalSearchParams<{ cabinetId?: string }>();
  const palette = useAppTheme();
  const { lang, tr } = useAppText();
  const copy = STATS_COPY[lang as keyof typeof STATS_COPY] ?? STATS_COPY.en;
  const scopeLabels = SCOPE_LABELS[lang] ?? SCOPE_LABELS.en;
  const gradePeriodLabels = {
    ru: { day: 'День', week: 'Неделя', month: 'Месяц', quarter: '3 месяца', year: 'Год', custom: 'Свой период', worst: 'худшая', pointsStats: 'Статистика по баллам', gradeStats: 'Статистика по оценкам' },
    en: { day: 'Day', week: 'Week', month: 'Month', quarter: '3 months', year: 'Year', custom: 'Custom', worst: 'worst', pointsStats: 'Points stats', gradeStats: 'Grade stats' },
    zh: { day: '今天', week: '周', month: '月', quarter: '3个月', year: '年', custom: '自定义', worst: '最低', pointsStats: '积分统计', gradeStats: '成绩统计' },
    fr: { day: 'Jour', week: 'Semaine', month: 'Mois', quarter: '3 mois', year: 'An', custom: 'Personnalise', worst: 'plus faible', pointsStats: 'Statistiques des points', gradeStats: 'Statistiques des notes' },
    de: { day: 'Tag', week: 'Woche', month: 'Monat', quarter: '3 Monate', year: 'Jahr', custom: 'Eigener Zeitraum', worst: 'schlechteste', pointsStats: 'Punktestatistik', gradeStats: 'Notenstatistik' },
    it: { day: 'Giorno', week: 'Settimana', month: 'Mese', quarter: '3 mesi', year: 'Anno', custom: 'Personalizzato', worst: 'peggiore', pointsStats: 'Statistiche punti', gradeStats: 'Statistiche voti' },
    es: { day: 'Dia', week: 'Semana', month: 'Mes', quarter: '3 meses', year: 'Ano', custom: 'Personalizado', worst: 'peor', pointsStats: 'Estadistica de puntos', gradeStats: 'Estadistica de notas' },
  }[lang as 'ru' | 'en' | 'zh' | 'fr' | 'de' | 'it' | 'es'] ?? {
    day: 'Day', week: 'Week', month: 'Month', quarter: '3 months', year: 'Year', custom: 'Custom', worst: 'worst', pointsStats: 'Points stats', gradeStats: 'Grade stats',
  };
  const { selectedChild } = useChildStore();
  const { cabinets } = useCabinetStore();
  const child = selectedChild();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activePeriod, setActivePeriod] = useState<PeriodType>('month');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [gradePeriod, setGradePeriod] = useState<GradePeriodType>('month');
  const [gradeSubjectId, setGradeSubjectId] = useState<string>('');
  const [gradeFromDate, setGradeFromDate] = useState(shiftDateString(formatDateISO(new Date()), -29));
  const [gradeToDate, setGradeToDate] = useState(formatDateISO(new Date()));
  const [gradePeriodPickerOpen, setGradePeriodPickerOpen] = useState(false);
  const [gradeSubjectPickerOpen, setGradeSubjectPickerOpen] = useState(false);
  const [selectedCabinetScopeId, setSelectedCabinetScopeId] = useState<string>('all');

  const categoryColors: Record<ActivityType, string> = {
    study: palette.study,
    sport: palette.sport,
    behavior: palette.behavior,
    task: palette.tasks,
  };

  useEffect(() => {
    if (!child) return;
    return ActivityService.subscribeToActivities(child.id, setActivities);
  }, [child?.id]);

  const period = PERIODS.find((item) => item.key === activePeriod) ?? PERIODS[1];
  const today = formatDateISO(new Date());
  const archivedCabinets = useMemo(
    () => cabinets
      .filter((item) => (!child || item.childId === child.id) && (item.status === 'archived' || item.status === 'completed' || item.archivedAt))
      .sort((a, b) => b.createdAt - a.createdAt),
    [cabinets, child?.id],
  );
  const scopedCabinet = archivedCabinets.find((item) => item.id === selectedCabinetScopeId);
  const fromDate = scopedCabinet?.startDate ?? shiftDateString(today, -(period.days - 1));
  const toDate = scopedCabinet?.endDate ?? today;

  useEffect(() => {
    if (cabinetId && cabinets.some((item) => item.id === cabinetId)) {
      setSelectedCabinetScopeId(cabinetId);
    }
  }, [cabinetId, cabinets]);

  const subjectOptions = useMemo(() => {
    const byId = new Map<string, string>();
    cabinets
      .filter((cabinet) => !child || cabinet.childId === child.id)
      .forEach((cabinet) => {
        cabinet.subjects.forEach((subject) => byId.set(subject.id, getSubjectDisplayName(subject, lang)));
      });
    activities
      .filter((activity) => activity.type === 'study' && activity.subjectId)
      .forEach((activity) => byId.set(activity.subjectId!, getLocalizedSubjectName(activity.subjectName, lang) || copy.subjectFallback));
    return Array.from(byId.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [activities, cabinets, child?.id, copy.subjectFallback, lang]);

  const statsScopeOptions = useMemo(() => [
    { id: 'all', name: scopeLabels.all },
    { id: 'type:study', name: scopeLabels.studyAll },
    { id: 'type:sport', name: copy.categories.sport },
    { id: 'type:behavior', name: copy.categories.behavior },
    { id: 'type:task', name: copy.categories.task },
    ...subjectOptions,
  ], [copy.categories, scopeLabels.all, scopeLabels.studyAll, subjectOptions]);

  const gradeSubjectOptions = useMemo(() => [
    { id: 'all-study', name: scopeLabels.studyAll },
    ...subjectOptions,
  ], [scopeLabels.studyAll, subjectOptions]);

  const scopedActivities = useMemo(() => {
    return activities.filter((activity) => {
      const insideRange = compareDateStrings(activity.date, fromDate) >= 0 && compareDateStrings(activity.date, toDate) <= 0;
      const cabinetMatch = !scopedCabinet || activity.cabinetId === scopedCabinet.id;
      const subjectMatch = selectedSubjectId === 'all'
        || (selectedSubjectId.startsWith('type:') ? activity.type === selectedSubjectId.replace('type:', '') : activity.subjectId === selectedSubjectId);
      return insideRange && cabinetMatch && subjectMatch;
    });
  }, [activities, fromDate, scopedCabinet, selectedSubjectId, toDate]);

  useEffect(() => {
    if (!gradeSubjectId) {
      setGradeSubjectId('all-study');
    }
  }, [gradeSubjectId]);

  useEffect(() => {
    if (scopedCabinet) {
      setGradeFromDate(scopedCabinet.startDate);
      setGradeToDate(scopedCabinet.endDate);
      setGradePeriod('custom');
    }
  }, [scopedCabinet?.id]);

  useEffect(() => {
    setGradeFromDate(fromDate);
    setGradeToDate(toDate);
  }, [fromDate, toDate]);

  useEffect(() => {
    const selected = GRADE_PERIODS.find((item) => item.key === gradePeriod);
    if (!selected?.days || scopedCabinet) return;
    const end = formatDateISO(new Date());
    setGradeToDate(end);
    setGradeFromDate(shiftDateString(end, -(selected.days - 1)));
  }, [gradePeriod, scopedCabinet]);

  const dailyStats = useMemo(() => StatsService.getDailyStats(scopedActivities, period.days), [scopedActivities, period.days]);
  const categoryBreakdown = useMemo(() => StatsService.getCategoryBreakdown(scopedActivities), [scopedActivities]);
  const summary = useMemo(() => StatsService.getSummary(scopedActivities), [scopedActivities]);

  const gradeActivities = useMemo(
    () => scopedActivities.filter((activity) => activity.type === 'study' && getActivityGradeValue(activity) !== null),
    [scopedActivities],
  );

  const todayGradeActivities = useMemo(
    () => activities.filter((activity) => activity.date === today && activity.type === 'study' && getActivityGradeValue(activity) !== null),
    [activities, today],
  );

  const gradeScopedActivities = useMemo(
    () => activities.filter((activity) => {
      const insideRange = compareDateStrings(activity.date, gradeFromDate) >= 0 && compareDateStrings(activity.date, gradeToDate) <= 0;
      const cabinetMatch = !scopedCabinet || activity.cabinetId === scopedCabinet.id;
      const subjectMatch = !gradeSubjectId || gradeSubjectId === 'all-study' || activity.subjectId === gradeSubjectId;
      return activity.type === 'study' && insideRange && cabinetMatch && subjectMatch && getActivityGradeValue(activity) !== null;
    }),
    [activities, gradeFromDate, gradeSubjectId, gradeToDate, scopedCabinet],
  );

  const gradeSummary = useMemo(() => {
    const grades = gradeScopedActivities.map(getActivityGradeValue).filter((value): value is number => value !== null);
    const average = grades.length ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : 0;
    const best = grades.length ? Math.max(...grades) : 0;
    const worst = grades.length ? Math.min(...grades) : 0;
    return { count: grades.length, average, best, worst };
  }, [gradeScopedActivities]);

  const subjectStats = useMemo(() => {
    const bySubject = new Map<string, { id: string; name: string; points: number; grades: number[]; count: number; category: string }>();
    const recommendationSource = todayGradeActivities.length > 0 ? todayGradeActivities : gradeActivities;
    recommendationSource.forEach((activity) => {
      const id = activity.subjectId ?? (activity.subjectName || copy.subjectFallback);
      const current = bySubject.get(id) ?? {
        id,
        name: subjectOptions.find((subject) => subject.id === id)?.name ?? (getLocalizedSubjectName(activity.subjectName, lang) || copy.subjectFallback),
        points: 0,
        grades: [],
        count: 0,
        category: activity.subjectCategory ?? 'C',
      };
      const grade = getActivityGradeValue(activity);
      bySubject.set(id, {
        ...current,
        points: current.points + activity.points,
        grades: grade === null ? current.grades : [...current.grades, grade],
        count: current.count + 1,
      });
    });

    return Array.from(bySubject.values())
      .map((subject) => ({
        ...subject,
        averageGrade: subject.grades.length ? subject.grades.reduce((sum, grade) => sum + grade, 0) / subject.grades.length : 0,
        averagePoints: subject.count ? subject.points / subject.count : 0,
      }))
      .sort((a, b) => a.averageGrade - b.averageGrade);
  }, [copy.subjectFallback, gradeActivities, lang, subjectOptions, todayGradeActivities]);

  const selectedSubjectLabel = selectedSubjectId === 'all'
    ? copy.allSubjects
    : statsScopeOptions.find((subject) => subject.id === selectedSubjectId)?.name ?? copy.subjectFallback;

  const recommendations = useMemo(() => {
    if (subjectStats.length === 0) return [];
    return subjectStats.slice(0, 4).map((subject) => {
      if (subject.averageGrade <= gradeSummary.average && subject.category !== 'A') {
        return tr(copy.raiseCategory, { name: subject.name, grade: formatPoints(subject.averageGrade) });
      }
      if (subject.averageGrade > gradeSummary.average && subject.category === 'A') {
        return tr(copy.lowerCategory, { name: subject.name });
      }
      return tr(copy.keepCategory, { name: subject.name, category: subject.category });
    });
  }, [copy, gradeSummary.average, subjectStats, tr]);

  const renderLineChart = () => {
    const chartWidth = Math.max(280, SCREEN_W - 72);
    const chartHeight = 210;
    const padding = { left: 42, right: 16, top: 18, bottom: 34 };
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;
    const values = dailyStats.map((day) => day.totalPoints);
    const minValue = Math.min(0, ...values);
    const maxValue = Math.max(1, ...values);
    const valueRange = Math.max(1, maxValue - minValue);
    const pointFor = (value: number, index: number) => {
      const x = padding.left + (dailyStats.length <= 1 ? 0 : (index / (dailyStats.length - 1)) * plotWidth);
      const y = padding.top + plotHeight - ((value - minValue) / valueRange) * plotHeight;
      return { x, y };
    };
    const points = values.map((value, index) => pointFor(value, index));
    const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
    const zeroY = pointFor(0, 0).y;
    const yTicks = [maxValue, Math.round((maxValue + minValue) / 2), minValue];
    const xTickIndexes = [0, Math.floor((dailyStats.length - 1) / 2), dailyStats.length - 1].filter((value, index, array) => array.indexOf(value) === index);

    return (
      <View style={styles.chartContainer}>
        <Text style={[styles.chartTitle, { color: palette.textPrimary }]}>{copy.pointsDynamics}</Text>
        <Svg width={chartWidth} height={chartHeight}>
          <Line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke={palette.border} strokeWidth={1} />
          <Line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke={palette.border} strokeWidth={1} />
          <Line x1={padding.left} y1={zeroY} x2={padding.left + plotWidth} y2={zeroY} stroke={palette.textTertiary} strokeWidth={1} strokeDasharray="4 4" />
          {yTicks.map((tick) => {
            const y = pointFor(tick, 0).y;
            return (
              <React.Fragment key={`y_${tick}`}>
                <Line x1={padding.left - 4} y1={y} x2={padding.left + plotWidth} y2={y} stroke={palette.border} strokeWidth={0.5} opacity={0.5} />
                <SvgText x={padding.left - 8} y={y + 4} fill={palette.textSecondary} fontSize="10" textAnchor="end">{formatPoints(tick)}</SvgText>
              </React.Fragment>
            );
          })}
          <Polyline points={polyline} fill="none" stroke={palette.primary} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((point, index) => (
            <Circle key={`${dailyStats[index].date}_${index}`} cx={point.x} cy={point.y} r={3.5} fill={palette.primary} />
          ))}
          {xTickIndexes.map((index) => {
            const point = points[index] ?? pointFor(0, index);
            return (
              <SvgText key={`x_${index}`} x={point.x} y={chartHeight - 10} fill={palette.textSecondary} fontSize="9" textAnchor="middle">
                {shortDateLabel(dailyStats[index]?.date ?? '')}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    );
  };

  const renderPieChart = () => {
    const total = categoryBreakdown.reduce((sum, item) => sum + Math.max(item.points, 0), 0);
    if (total === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={[styles.chartTitle, { color: palette.textPrimary }]}>{copy.categoryDistribution}</Text>
          <Text style={[styles.noDataText, { color: palette.textTertiary }]}>{copy.noData}</Text>
        </View>
      );
    }

    const size = 136;
    const strokeWidth = 18;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
      <View style={styles.chartContainer}>
        <Text style={[styles.chartTitle, { color: palette.textPrimary }]}>{copy.categoryDistribution}</Text>
        <View style={styles.pieContainer}>
          <View style={styles.pieWrapper}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {categoryBreakdown.filter((cat) => cat.points > 0).map((cat) => {
                const segmentLength = (cat.points / total) * circumference;
                const segment = (
                  <Circle
                    key={cat.category}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={categoryColors[cat.category]}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                    strokeDashoffset={-offset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  />
                );
                offset += segmentLength;
                return segment;
              })}
            </Svg>
            <View style={styles.pieCenter}>
              <Text style={[styles.pieTotal, { color: palette.textPrimary }]}>{formatPoints(total)}</Text>
              <Text style={[styles.pieTotalLabel, { color: palette.textSecondary }]}>{copy.points}</Text>
            </View>
          </View>

          <View style={styles.legend}>
            {categoryBreakdown.map((cat) => (
              <View key={cat.category} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: categoryColors[cat.category] }]} />
                <Text style={[styles.legendLabel, { color: palette.textSecondary }]}>{copy.categories[cat.category]}</Text>
                <Text style={[styles.legendValue, { color: palette.textPrimary }]}>{cat.percentage}%</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  if (!child) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>{copy.addChild}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.title, { color: palette.textPrimary }]}>{copy.title}</Text>
      <Text style={[styles.rangeText, { color: palette.textSecondary }]}>{copy.range}: {normalizeDateDisplay(fromDate)} - {normalizeDateDisplay(toDate)}</Text>

      {archivedCabinets.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.archiveScopeRow}>
          <TouchableOpacity
            style={[
              styles.archiveScopeChip,
              { backgroundColor: palette.surface, borderColor: selectedCabinetScopeId === 'all' ? palette.primary : palette.border },
              selectedCabinetScopeId === 'all' && { backgroundColor: palette.primaryContainer },
            ]}
            onPress={() => setSelectedCabinetScopeId('all')}
          >
            <Text style={[styles.archiveScopeText, { color: selectedCabinetScopeId === 'all' ? palette.primary : palette.textSecondary }]}>{scopeLabels.all}</Text>
          </TouchableOpacity>
          {archivedCabinets.map((item) => {
            const active = selectedCabinetScopeId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.archiveScopeChip,
                  { backgroundColor: palette.surface, borderColor: active ? palette.primary : palette.border },
                  active && { backgroundColor: palette.primaryContainer },
                ]}
                onPress={() => setSelectedCabinetScopeId(item.id)}
              >
                <Text style={[styles.archiveScopeText, { color: active ? palette.primary : palette.textSecondary }]} numberOfLines={1}>
                  {item.name} · {normalizeDateDisplay(item.startDate)} - {normalizeDateDisplay(item.endDate)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.periodRow}>
        {PERIODS.map((item) => {
          const active = activePeriod === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.periodChip, { backgroundColor: palette.surface, borderColor: palette.border }, active && { backgroundColor: palette.primaryContainer, borderColor: palette.primary }]}
              onPress={() => setActivePeriod(item.key)}
            >
              <Text style={[styles.periodText, { color: active ? palette.primary : palette.textSecondary }, active && styles.periodTextActive]}>
                {copy.periods[item.labelKey]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.subjectFilterWrap}>
        <TouchableOpacity style={[styles.subjectFilter, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => setSubjectPickerOpen((value) => !value)}>
          <Text style={[styles.subjectFilterText, { color: palette.textPrimary }]} numberOfLines={1}>{selectedSubjectLabel}</Text>
          <ChevronDown size={18} color={palette.textSecondary} />
        </TouchableOpacity>
        {subjectPickerOpen && (
          <Card style={styles.subjectOptions}>
            {statsScopeOptions.map((subject) => (
              <TouchableOpacity key={subject.id} style={styles.subjectOption} onPress={() => { setSelectedSubjectId(subject.id); setSubjectPickerOpen(false); }}>
                <Text style={[styles.subjectOptionText, { color: selectedSubjectId === subject.id ? palette.primary : palette.textPrimary }]} numberOfLines={1}>{subject.name}</Text>
                {selectedSubjectId === subject.id && <Check size={16} color={palette.primary} />}
              </TouchableOpacity>
            ))}
          </Card>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{gradePeriodLabels.pointsStats}</Text>
        <View style={styles.summaryGrid}>
          <Card style={styles.summaryCard} padding="medium">
            <TrendingUp size={20} color={palette.primary} />
            <Text style={[styles.summaryValue, { color: palette.textPrimary }]}>{formatPoints(summary.totalEarned)}</Text>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>{copy.pointsEarned}</Text>
          </Card>
          <Card style={styles.summaryCard} padding="medium">
            <Award size={20} color={palette.success} />
            <Text style={[styles.summaryValue, { color: palette.textPrimary }]}>{formatPoints(summary.averagePerDay)}</Text>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>{copy.averagePerDay}</Text>
          </Card>
          <Card style={styles.summaryCard} padding="medium">
            <Zap size={20} color={palette.study} />
            <Text style={[styles.summaryValue, { color: palette.textPrimary }]}>{summary.totalActivities}</Text>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>{copy.activities}</Text>
          </Card>
          <Card style={styles.summaryCard} padding="medium">
            <Calendar size={20} color={palette.tasks} />
            <Text style={[styles.summaryValue, { color: palette.textPrimary }]}>
              {summary.bestDay.points > 0 ? `+${formatPoints(summary.bestDay.points)}` : 0}
            </Text>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>{copy.bestDay}</Text>
          </Card>
        </View>

        <Card>{renderLineChart()}</Card>
        <Card style={styles.pieCard}>{renderPieChart()}</Card>

        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>{gradePeriodLabels.gradeStats}</Text>
        <Card style={styles.gradeCard}>
          <View style={styles.cardHeader}>
            <BarChart3 size={20} color={palette.primary} />
            <Text style={[styles.chartTitleInline, { color: palette.textPrimary }]}>{copy.gradeStats}</Text>
          </View>
          <View style={styles.gradeControls}>
            <TouchableOpacity style={[styles.gradeSelector, { backgroundColor: palette.background, borderColor: palette.border }]} onPress={() => setGradePeriodPickerOpen((value) => !value)}>
              <Text style={[styles.gradeSelectorText, { color: palette.textPrimary }]}>{gradePeriodLabels[GRADE_PERIODS.find((item) => item.key === gradePeriod)?.labelKey ?? 'month']}</Text>
              <ChevronDown size={16} color={palette.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.gradeSelector, { backgroundColor: palette.background, borderColor: palette.border }]} onPress={() => setGradeSubjectPickerOpen((value) => !value)}>
              <Text style={[styles.gradeSelectorText, { color: palette.textPrimary }]} numberOfLines={1}>
                {gradeSubjectOptions.find((subject) => subject.id === gradeSubjectId)?.name ?? scopeLabels.studyAll}
              </Text>
              <ChevronDown size={16} color={palette.textSecondary} />
            </TouchableOpacity>
          </View>
          {gradePeriodPickerOpen && (
            <View style={[styles.gradeMenu, { borderColor: palette.border }]}>
              {GRADE_PERIODS.map((item) => (
                <TouchableOpacity key={item.key} style={styles.gradeMenuItem} onPress={() => { setGradePeriod(item.key); setGradePeriodPickerOpen(false); }}>
                  <Text style={[styles.subjectOptionText, { color: gradePeriod === item.key ? palette.primary : palette.textPrimary }]}>{gradePeriodLabels[item.labelKey]}</Text>
                  {gradePeriod === item.key && <Check size={16} color={palette.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
          {gradeSubjectPickerOpen && (
            <View style={[styles.gradeMenu, { borderColor: palette.border }]}>
              {gradeSubjectOptions.map((subject) => (
                <TouchableOpacity key={subject.id} style={styles.gradeMenuItem} onPress={() => { setGradeSubjectId(subject.id); setGradeSubjectPickerOpen(false); }}>
                  <Text style={[styles.subjectOptionText, { color: gradeSubjectId === subject.id ? palette.primary : palette.textPrimary }]} numberOfLines={1}>{subject.name}</Text>
                  {gradeSubjectId === subject.id && <Check size={16} color={palette.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.gradeDateRow}>
            <DateInput label={copy.range} value={gradeFromDate} onChange={(value) => { setGradeFromDate(value); setGradePeriod('custom'); }} style={styles.gradeDateInput} />
            <DateInput label="-" value={gradeToDate} onChange={(value) => { setGradeToDate(value); setGradePeriod('custom'); }} style={styles.gradeDateInput} />
          </View>
          <View style={styles.gradeSummaryRow}>
            <View style={styles.gradeMetric}>
              <Text style={[styles.gradeMetricValue, { color: palette.textPrimary }]}>{gradeSummary.count}</Text>
              <Text style={[styles.gradeMetricLabel, { color: palette.textSecondary }]}>{copy.grades}</Text>
            </View>
            <View style={styles.gradeMetric}>
              <Text style={[styles.gradeMetricValue, { color: palette.textPrimary }]}>{formatPoints(gradeSummary.average)}</Text>
              <Text style={[styles.gradeMetricLabel, { color: palette.textSecondary }]}>{copy.average}</Text>
            </View>
            <View style={styles.gradeMetric}>
              <Text style={[styles.gradeMetricValue, { color: palette.textPrimary }]}>{formatPoints(gradeSummary.worst)}</Text>
              <Text style={[styles.gradeMetricLabel, { color: palette.textSecondary }]}>{gradePeriodLabels.worst}</Text>
            </View>
            <View style={styles.gradeMetric}>
              <Text style={[styles.gradeMetricValue, { color: palette.textPrimary }]}>{formatPoints(gradeSummary.best)}</Text>
              <Text style={[styles.gradeMetricLabel, { color: palette.textSecondary }]}>{copy.best}</Text>
            </View>
          </View>

          {gradeSummary.count === 0 ? (
            <Text style={[styles.noDataText, { color: palette.textTertiary }]}>{copy.noGrades}</Text>
          ) : (
            [].map((subject: any) => (
              <View key={subject.id} style={[styles.subjectStatRow, { borderTopColor: palette.border }]}>
                <View style={styles.subjectStatMain}>
                  <Text style={[styles.subjectStatName, { color: palette.textPrimary }]} numberOfLines={1}>{subject.name}</Text>
                  <Text style={[styles.subjectStatMeta, { color: palette.textSecondary }]}>{copy.category} {subject.category} · {subject.count} {copy.grades}</Text>
                </View>
                <View style={styles.subjectStatValues}>
                  <Text style={[styles.subjectStatGrade, { color: palette.primary }]}>{formatPoints(subject.averageGrade)}</Text>
                  <Text style={[styles.subjectStatPoints, { color: subject.points >= 0 ? palette.success : palette.danger }]}>{subject.points > 0 ? '+' : ''}{formatPoints(subject.points)}</Text>
                </View>
              </View>
            ))
          )}
        </Card>

        <Card style={styles.recommendationsCard}>
          <Text style={[styles.chartTitleInline, { color: palette.textPrimary }]}>{copy.recommendations}</Text>
          {recommendations.length === 0 ? (
            <Text style={[styles.noDataText, { color: palette.textTertiary }]}>{copy.noRecommendations}</Text>
          ) : (
            recommendations.map((item) => (
              <Text key={item} style={[styles.recommendationText, { color: palette.textSecondary }]}>{item}</Text>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  rangeText: { paddingHorizontal: 20, marginBottom: 10, fontSize: 12, fontWeight: '700' },
  periodRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  archiveScopeRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  archiveScopeChip: { maxWidth: 260, minHeight: 34, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  archiveScopeText: { fontSize: 12, fontWeight: '800' },
  periodChip: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 8 },
  periodText: { fontSize: 12, fontWeight: '700' },
  periodTextActive: { fontWeight: '900' },
  subjectFilterWrap: { paddingHorizontal: 20, marginBottom: 8 },
  subjectFilter: { minHeight: 42, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  subjectFilterText: { flex: 1, fontWeight: '800' },
  subjectOptions: { marginTop: 8, paddingVertical: 6 },
  subjectOption: { minHeight: 40, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  subjectOptionText: { flex: 1, fontWeight: '700' },
  scrollContent: { padding: 20, gap: 16, paddingBottom: 100 },
  sectionTitle: { fontSize: 17, fontWeight: '900', marginTop: 2 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: { flex: 1, minWidth: (SCREEN_W - 60) / 2, alignItems: 'center', gap: 6 },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 12, textAlign: 'center' },
  chartContainer: { padding: 16 },
  chartTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  chartTitleInline: { fontSize: 18, fontWeight: '800' },
  pieCard: { padding: 0 },
  pieContainer: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  pieWrapper: { width: 136, height: 136, justifyContent: 'center', alignItems: 'center' },
  pieCenter: { position: 'absolute', alignItems: 'center' },
  pieTotal: { fontSize: 22, fontWeight: '800' },
  pieTotalLabel: { fontSize: 12 },
  legend: { flex: 1, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13 },
  legendValue: { fontWeight: '800' },
  gradeCard: { padding: 16, gap: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gradeControls: { flexDirection: 'row', gap: 8 },
  gradeSelector: { flex: 1, minHeight: 40, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  gradeSelectorText: { flex: 1, fontSize: 12, fontWeight: '800' },
  gradeMenu: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  gradeMenuItem: { minHeight: 38, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  gradeDateRow: { flexDirection: 'column', gap: 10 },
  gradeDateInput: { width: '100%' },
  gradeSummaryRow: { flexDirection: 'row', gap: 8 },
  gradeMetric: { flex: 1, borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  gradeMetricValue: { fontSize: 22, fontWeight: '900' },
  gradeMetricLabel: { fontSize: 12, fontWeight: '700' },
  subjectStatRow: { borderTopWidth: 1, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  subjectStatMain: { flex: 1, minWidth: 0 },
  subjectStatName: { fontSize: 15, fontWeight: '800' },
  subjectStatMeta: { marginTop: 2, fontSize: 12, fontWeight: '600' },
  subjectStatValues: { alignItems: 'flex-end' },
  subjectStatGrade: { fontSize: 18, fontWeight: '900' },
  subjectStatPoints: { fontSize: 12, fontWeight: '800' },
  noDataText: { textAlign: 'center', paddingVertical: 20 },
  recommendationsCard: { padding: 16, gap: 10 },
  recommendationText: { lineHeight: 20 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, textAlign: 'center' },
});

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { ProgressBar } from '../components/ui/ProgressBar';
import { DateInput } from '../components/DateInput';
import { normalizeDateDisplay } from '../utils/datePeriod';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuthStore } from '../stores/authStore';
import { useCabinetStore } from '../stores/cabinetStore';
import { useChildStore } from '../stores/childStore';
import { useUIStore } from '../stores/uiStore';
import { CabinetService } from '../services/cabinetService';
import { ChildService } from '../services/childService';
import { RewardService } from '../services/rewardService';
import { DEFAULT_SUBJECTS } from '../constants/subjects';
import { GradeSystem, PeriodType, Subject, SubjectCategory } from '../types';
import { useAppText } from '../hooks/useAppText';
import { getSubjectDisplayName } from '../utils/subjects';
import { calculateStudyPoints, formatPoints, getGradeOptions } from '../utils/gradeScoring';

const PERIODS: { value: PeriodType; label: string }[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Четверть' },
  { value: 'semester', label: 'Полугодие' },
  { value: 'year', label: 'Год' },
];

const GRADE_SYSTEMS: { value: GradeSystem; label: string }[] = [
  { value: '5', label: '5-балльная' },
  { value: '10', label: '10-балльная' },
  { value: '12', label: '12-балльная' },
  { value: 'letter', label: 'A-F' },
  { value: 'percent', label: '0-100%' },
  { value: 'gpa', label: 'GPA' },
];

const SUBJECT_CATEGORIES: { value: SubjectCategory; label: string; hint: string }[] = [
  { value: 'A', label: 'A', hint: 'важные или сложные' },
  { value: 'B', label: 'B', hint: 'обычная важность' },
  { value: 'C', label: 'C', hint: 'поддерживающие' },
];

const WEEKDAYS = [
  { day: 1, label: 'Пн' },
  { day: 2, label: 'Вт' },
  { day: 3, label: 'Ср' },
  { day: 4, label: 'Чт' },
  { day: 5, label: 'Пт' },
  { day: 6, label: 'Сб' },
  { day: 0, label: 'Вс' },
];

export default function CabinetWizardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ fresh?: string; copy?: string }>();
  const Colors = useAppTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { user } = useAuthStore();
  const { lang } = useAppText();
  const { selectedChild, updateChild } = useChildStore();
  const { settings } = useUIStore();
  const { cabinets, wizard, updateWizard, nextStep, prevStep, resetWizard, addCabinet, setActiveCabinet } = useCabinetStore();
  const [customSubject, setCustomSubject] = useState('');
  const [gradeWeightsOpen, setGradeWeightsOpen] = useState(false);
  const [weightDrafts, setWeightDrafts] = useState<Record<SubjectCategory, string>>({ A: '1.5', B: '1.2', C: '1' });
  const [moneyPerPointDraft, setMoneyPerPointDraft] = useState(String(wizard.moneyPerPoint ?? 1));
  const [loading, setLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const child = selectedChild();
  const totalSteps = 6;

  useEffect(() => {
    if (params.fresh === '1' && params.copy !== '1') {
      resetWizard();
      setMoneyPerPointDraft('1');
    }
  }, [params.fresh, params.copy, resetWizard]);

  const gradeSystemLabel = useMemo(
    () => GRADE_SYSTEMS.find((system) => system.value === wizard.gradeSystem)?.label ?? wizard.gradeSystem,
    [wizard.gradeSystem]
  );

  const parseWeightDraft = (value: string) => {
    const normalized = value.replace(',', '.').trim();
    const numeric = Number(normalized);
    if (!Number.isFinite(numeric) || numeric < 0.01 || numeric > 100) return null;
    return Math.round(numeric * 100) / 100;
  };

  const previewWeights = useMemo(() => {
    if (!gradeWeightsOpen) return wizard.categoryWeights;
    return (['A', 'B', 'C'] as SubjectCategory[]).reduce((acc, category) => {
      acc[category] = parseWeightDraft(weightDrafts[category]) ?? wizard.categoryWeights[category];
      return acc;
    }, { ...wizard.categoryWeights });
  }, [gradeWeightsOpen, weightDrafts, wizard.categoryWeights]);

  const gradePreviewRows = useMemo(() => getGradeOptions(wizard.gradeSystem).slice().reverse().map((grade) => ({
    label: grade.label,
    A: calculateStudyPoints(grade.value, wizard.gradeSystem, 'A', previewWeights),
    B: calculateStudyPoints(grade.value, wizard.gradeSystem, 'B', previewWeights),
    C: calculateStudyPoints(grade.value, wizard.gradeSystem, 'C', previewWeights),
  })), [previewWeights, wizard.gradeSystem]);

  const startWeightEdit = () => {
    setWeightDrafts({
      A: String(wizard.categoryWeights.A),
      B: String(wizard.categoryWeights.B),
      C: String(wizard.categoryWeights.C),
    });
    setGradeWeightsOpen(true);
  };

  const cancelWeightEdit = () => {
    setWeightDrafts({
      A: String(wizard.categoryWeights.A),
      B: String(wizard.categoryWeights.B),
      C: String(wizard.categoryWeights.C),
    });
    setGradeWeightsOpen(false);
  };

  const saveWeightEdit = () => {
    const next = (['A', 'B', 'C'] as SubjectCategory[]).reduce((acc, category) => {
      const value = parseWeightDraft(weightDrafts[category]);
      if (value === null) return acc;
      acc[category] = value;
      return acc;
    }, {} as Partial<Record<SubjectCategory, number>>);
    if (next.A === undefined || next.B === undefined || next.C === undefined) {
      Alert.alert('Коэффициенты', 'Введите значения от 0.01 до 100.00. Можно использовать точку или запятую.');
      return;
    }
    updateWizard({ categoryWeights: { A: next.A, B: next.B, C: next.C } });
    setGradeWeightsOpen(false);
  };

  const handleToggleSubject = (subject: Omit<Subject, 'id' | 'custom'>) => {
    const exists = wizard.subjects.find((item) => item.nameRu === subject.nameRu);
    if (exists) {
      updateWizard({
        subjects: wizard.subjects.filter((item) => item.nameRu !== subject.nameRu),
        schedule: wizard.schedule.map((day) => ({
          ...day,
          subjects: day.subjects.filter((id) => id !== exists.id),
        })),
      });
      return;
    }

    if (settings.subscription === 'free' && wizard.subjects.length >= 5) {
      Alert.alert('Premium', 'В бесплатном плане можно выбрать до 5 предметов. Больше предметов доступно в Premium.');
      return;
    }
    const newSubject: Subject = {
      ...subject,
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      custom: false,
    };
    updateWizard({ subjects: [...wizard.subjects, newSubject] });
  };

  const handleAddCustomSubject = () => {
    if (!customSubject.trim()) return;
    if (settings.subscription === 'free' && wizard.subjects.length >= 5) {
      Alert.alert('Premium', 'В бесплатном плане можно выбрать до 5 предметов. Больше предметов доступно в Premium.');
      return;
    }
    const name = customSubject.trim();
    updateWizard({
      subjects: [
        ...wizard.subjects,
        { id: `sub_custom_${Date.now()}`, name, nameRu: name, nameEn: name, nameZh: name, category: 'C', custom: true },
      ],
    });
    setCustomSubject('');
  };

  const setSubjectCategory = (subjectId: string, category: SubjectCategory) => {
    updateWizard({
      subjects: wizard.subjects.map((subject) =>
        subject.id === subjectId ? { ...subject, category } : subject
      ),
    });
  };

  const toggleScheduleSubject = (day: number, subjectId: string) => {
    const existing = wizard.schedule.find((item) => item.day === day);
    if (!existing) {
      updateWizard({ schedule: [...wizard.schedule, { day, subjects: [subjectId] }] });
      return;
    }
    const hasSubject = existing.subjects.includes(subjectId);
    updateWizard({
      schedule: wizard.schedule.map((item) =>
        item.day === day
          ? {
              ...item,
              subjects: hasSubject
                ? item.subjects.filter((id) => id !== subjectId)
                : [...item.subjects, subjectId],
            }
          : item
      ),
    });
  };

  const canContinue = wizard.step !== 3 || wizard.subjects.length > 0;

  const handleCreateCabinet = async () => {
    if (!child) {
      setCreateError('Сначала выберите ребёнка.');
      return;
    }

    const existingActiveCabinet = cabinets.find(
      (item) => item.childId === child.id && item.status !== 'completed' && item.status !== 'archived' && !item.archivedAt,
    );
    if (existingActiveCabinet) {
      const message = 'У ребёнка уже есть активный кабинет. Завершите, архивируйте или удалите его перед созданием нового.';
      setCreateError(message);
      Alert.alert('Кабинет уже создан', message);
      return;
    }

    setLoading(true);
    setCreateError('');
    try {
      const parsedMoneyPerPoint = Number(moneyPerPointDraft.replace(',', '.'));
      const cabinet = await CabinetService.createCabinet({
        name: wizard.name || `Кабинет ${child.name}`,
        childId: child.id,
        parentId: user?.uid ?? 'anonymous',
        startDate: wizard.startDate,
        endDate: wizard.endDate,
        periodType: wizard.periodType,
        subjects: wizard.subjects,
        schedule: wizard.schedule,
        gradeSystem: wizard.gradeSystem,
        sportEnabled: wizard.sportEnabled,
        behaviorEnabled: wizard.behaviorEnabled,
        maxPointsPerDay: wizard.maxPointsPerDay,
        maxPointsPerPeriod: wizard.minPointsForReward,
        minPointsForReward: wizard.minPointsForReward,
        scoringPreset: 'unlimited',
        categoryWeights: wizard.categoryWeights,
        activityTemplates: wizard.activityTemplates,
        currencyEnabled: true,
        pointsToCurrency: wizard.pointsToCurrency,
        currencySymbol: wizard.currencySymbol,
        moneyPerPoint: Number.isFinite(parsedMoneyPerPoint) ? Math.min(10000000000, Math.max(0, parsedMoneyPerPoint)) : 0,
        currencyCode: wizard.currencyCode,
        screenPointsPerTenMinutes: wizard.screenPointsPerTenMinutes,
      });
      await RewardService.createDefaultRewards(cabinet.id, cabinet.minPointsForReward ?? cabinet.maxPointsPerPeriod, {
        moneyPerPoint: cabinet.moneyPerPoint,
        currencySymbol: cabinet.currencySymbol,
        screenPointsPerTenMinutes: cabinet.screenPointsPerTenMinutes,
      });
      const childConversion = {
        moneyPerPoint: cabinet.moneyPerPoint,
        currencySymbol: cabinet.currencySymbol,
        currencyCode: cabinet.currencyCode,
        screenPointsPerTenMinutes: cabinet.screenPointsPerTenMinutes,
      };
      await ChildService.updateChild(child.id, childConversion);
      updateChild(child.id, childConversion);
      addCabinet(cabinet);
      setActiveCabinet(cabinet.id);
      resetWizard();
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Error creating cabinet:', err);
      const message = err instanceof Error ? err.message : 'Не удалось создать кабинет.';
      setCreateError(message);
      Alert.alert('Не удалось создать кабинет', message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (wizard.step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Основная информация</Text>
            <Input
              label="Название кабинета"
              value={wizard.name}
              onChangeText={(text) => updateWizard({ name: text })}
              placeholder={`Кабинет ${child?.name ?? ''}`}
            />
            <Text style={styles.inputLabel}>Период</Text>
            <View style={styles.periodGrid}>
              {PERIODS.map((period) => (
                <TouchableOpacity
                  key={period.value}
                  style={[styles.optionChip, wizard.periodType === period.value && styles.optionChipActive]}
                  onPress={() => updateWizard({ periodType: period.value })}
                >
                  <Text style={[styles.optionText, wizard.periodType === period.value && styles.optionTextActive]}>
                    {period.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <DateInput label="Дата начала" value={wizard.startDate} onChange={(startDate) => updateWizard({ startDate })} />
            <View style={styles.autoDateBox}>
              <Text style={styles.autoDateLabel}>Дата окончания проставится автоматически</Text>
              <Text style={styles.autoDateValue}>{normalizeDateDisplay(wizard.endDate)}</Text>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Предметы</Text>
            <Text style={styles.subtitle}>Выберите предметы, которые потом появятся в дневнике и оценках.</Text>
            <View style={styles.subjectsList}>
              {DEFAULT_SUBJECTS.map((subject) => {
                const selected = wizard.subjects.some((item) => item.nameRu === subject.nameRu);
                return (
                  <TouchableOpacity
                    key={subject.nameRu}
                    style={[styles.subjectChip, selected && styles.subjectChipSelected]}
                    onPress={() => handleToggleSubject(subject)}
                  >
                    <Text style={[styles.subjectText, selected && styles.subjectTextSelected]}>
                      {selected ? '✓ ' : ''}{getSubjectDisplayName(subject, lang)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.inlineRow}>
              <Input value={customSubject} onChangeText={setCustomSubject} placeholder="Свой предмет" style={{ flex: 1 }} />
              <Button title="+" onPress={handleAddCustomSubject} size="small" />
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Категории и расписание</Text>
            <Text style={styles.subtitle}>Категория влияет на баллы, а выбранные дни недели попадут во вкладку дневника.</Text>
            <Card style={styles.infoCard} padding="medium">
              <Text style={styles.summaryTitle}>Как выбирать категории</Text>
              <Text style={styles.summaryLine}>A - самые важные или сложные предметы: за хорошую оценку ребёнок получает больше баллов.</Text>
              <Text style={styles.summaryLine}>B - обычная важность. C - поддерживающие предметы с меньшим коэффициентом.</Text>
              <Text style={styles.summaryLine}>Итоговые баллы считаются по оценке и коэффициенту категории. Коэффициенты можно изменить на следующем шаге.</Text>
            </Card>
            {wizard.subjects.map((subject) => (
              <Card key={subject.id} padding="small" style={styles.subjectScheduleCard}>
                <View style={styles.subjectHeader}>
                  <Text style={styles.subjectTitle}>{getSubjectDisplayName(subject, lang)}</Text>
                  <Text style={styles.subjectMeta}>Категория {subject.category}</Text>
                </View>
                <View style={styles.categoryButtonRow}>
                  {SUBJECT_CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category.value}
                      style={[styles.categoryButton, subject.category === category.value && styles.categoryButtonActive]}
                      onPress={() => setSubjectCategory(subject.id, category.value)}
                    >
                      <Text style={[styles.categoryTitle, subject.category === category.value && styles.categoryTitleActive]}>
                        {category.label}
                      </Text>
                      <Text style={styles.categoryHint}>{category.hint}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.weekRow}>
                  {WEEKDAYS.map((weekday) => {
                    const active = wizard.schedule.find((item) => item.day === weekday.day)?.subjects.includes(subject.id);
                    return (
                      <TouchableOpacity
                        key={weekday.day}
                        style={[styles.weekdayChip, active && styles.weekdayChipActive]}
                        onPress={() => toggleScheduleSubject(weekday.day, subject.id)}
                      >
                        <Text style={[styles.weekdayText, active && styles.weekdayTextActive]}>{weekday.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Card>
            ))}
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Оценки и активности</Text>
            <Text style={styles.inputLabel}>Система оценок</Text>
            <View style={styles.periodGrid}>
              {GRADE_SYSTEMS.map((system) => (
                <TouchableOpacity
                  key={system.value}
                  style={[styles.optionChip, wizard.gradeSystem === system.value && styles.optionChipActive]}
                  onPress={() => updateWizard({ gradeSystem: system.value })}
                >
                  <Text style={[styles.optionText, wizard.gradeSystem === system.value && styles.optionTextActive]}>
                    {system.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Card style={styles.summaryCard} padding="medium">
              <View style={styles.scoreHeader}>
                <Text style={styles.summaryTitle}>Баллы за оценки</Text>
                {gradeWeightsOpen ? (
                  <View style={styles.weightActionRow}>
                    <TouchableOpacity onPress={cancelWeightEdit}>
                      <Text style={styles.cancelValue}>Отмена</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={saveWeightEdit}>
                      <Text style={styles.toggleValue}>Сохранить</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={startWeightEdit}>
                    <Text style={styles.toggleValue}>Изменить</Text>
                  </TouchableOpacity>
                )}
              </View>
              {gradeWeightsOpen && (
                <View style={styles.weightEditRow}>
                  {(['A', 'B', 'C'] as SubjectCategory[]).map((category) => (
                    <Input
                      key={category}
                      label={category}
                      value={weightDrafts[category]}
                      onChangeText={(value) => setWeightDrafts((current) => ({ ...current, [category]: value }))}
                      keyboardType="numeric"
                      style={styles.weightInput}
                    />
                  ))}
                </View>
              )}
              <View style={styles.scoreTable}>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreCellHead}>Оценка</Text>
                  <Text style={styles.scoreCellHead}>A</Text>
                  <Text style={styles.scoreCellHead}>B</Text>
                  <Text style={styles.scoreCellHead}>C</Text>
                </View>
                {gradePreviewRows.map((row) => (
                  <View key={row.label} style={styles.scoreRow}>
                    <Text style={styles.scoreCell}>{row.label}</Text>
                    <Text style={styles.scoreCell}>{formatPoints(row.A)}</Text>
                    <Text style={styles.scoreCell}>{formatPoints(row.B)}</Text>
                    <Text style={styles.scoreCell}>{formatPoints(row.C)}</Text>
                  </View>
                ))}
              </View>
            </Card>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => updateWizard({ sportEnabled: !wizard.sportEnabled })}
            >
              <Text style={styles.toggleLabel}>Спорт</Text>
              <Text style={styles.toggleValue}>{wizard.sportEnabled ? 'Включён' : 'Выключен'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => updateWizard({ behaviorEnabled: !wizard.behaviorEnabled })}
            >
              <Text style={styles.toggleLabel}>Поведение</Text>
              <Text style={styles.toggleValue}>{wizard.behaviorEnabled ? 'Включено' : 'Выключено'}</Text>
            </TouchableOpacity>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Баллы и награды</Text>
            <Text style={styles.subtitle}>
              Ребёнок зарабатывает баллы в текущем периоде. Если к концу периода он набрал минимальный порог, награды рассчитываются по указанному курсу и доступны в следующих периодах.
            </Text>
            <Input
              label="Минимум баллов за период"
              value={String(wizard.minPointsForReward)}
              onChangeText={(text) => {
                const value = parseInt(text, 10) || 0;
                updateWizard({ minPointsForReward: value, maxPointsPerPeriod: value });
              }}
              keyboardType="numeric"
            />
            <View style={styles.inlineRow}>
              <Input
                label="1 балл стоит"
                value={moneyPerPointDraft}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^\d.,]/g, '').replace(',', '.');
                  setMoneyPerPointDraft(cleaned);
                  if (cleaned === '' || cleaned === '.') return;
                  const value = Number(cleaned);
                  if (Number.isFinite(value)) {
                    updateWizard({ moneyPerPoint: Math.min(10000000000, Math.max(0, value)) });
                  }
                }}
                keyboardType="numeric"
                style={{ flex: 1 }}
              />
              <Input
                label="Валюта"
                value={wizard.currencySymbol}
                onChangeText={(text) => updateWizard({ currencySymbol: text.slice(0, 4) || '₽' })}
                style={styles.pointsInput}
              />
            </View>
            <View style={styles.periodGrid}>
              {[
                { code: 'RUB', symbol: '₽' },
                { code: 'BYN', symbol: 'Br' },
                { code: 'USD', symbol: '$' },
                { code: 'EUR', symbol: '€' },
              ].map((currency) => (
                <TouchableOpacity
                  key={currency.code}
                  style={[styles.optionChip, wizard.currencyCode === currency.code && styles.optionChipActive]}
                  onPress={() => updateWizard({ currencyCode: currency.code, currencySymbol: currency.symbol })}
                >
                  <Text style={[styles.optionText, wizard.currencyCode === currency.code && styles.optionTextActive]}>
                    {currency.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input
              label="Баллов за 10 минут экрана"
              value={String(wizard.screenPointsPerTenMinutes)}
              onChangeText={(text) => updateWizard({ screenPointsPerTenMinutes: Math.max(0, parseFloat(text.replace(',', '.')) || 0) })}
              keyboardType="numeric"
            />
            <Card style={styles.summaryCard} padding="medium">
              <Text style={styles.summaryTitle}>Как это сработает</Text>
              <Text style={styles.summaryLine}>Порог: {wizard.minPointsForReward} баллов за период.</Text>
              <Text style={styles.summaryLine}>Если порог не набран, награда периода не начисляется автоматически.</Text>
              <Text style={styles.summaryLine}>Если порог набран, {wizard.minPointsForReward} баллов дадут примерно {Math.round(wizard.minPointsForReward * wizard.moneyPerPoint * 100) / 100} {wizard.currencySymbol} или {Math.floor(wizard.minPointsForReward / Math.max(wizard.screenPointsPerTenMinutes, 1)) * 10} минут экрана.</Text>
            </Card>
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Свои категории</Text>
            <Text style={styles.subtitle}>Эти категории появятся при добавлении спорта, поведения и заданий. Их можно менять в следующих периодах.</Text>
            <TouchableOpacity style={styles.checkRow} onPress={() => updateWizard({ sportEnabled: !wizard.sportEnabled })}>
              <View style={[styles.checkBox, wizard.sportEnabled && styles.checkBoxActive]}>
                <Text style={styles.checkMark}>{wizard.sportEnabled ? '✓' : ''}</Text>
              </View>
              <Text style={styles.toggleLabel}>Спорт</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkRow} onPress={() => updateWizard({ behaviorEnabled: !wizard.behaviorEnabled })}>
              <View style={[styles.checkBox, wizard.behaviorEnabled && styles.checkBoxActive]}>
                <Text style={styles.checkMark}>{wizard.behaviorEnabled ? '✓' : ''}</Text>
              </View>
              <Text style={styles.toggleLabel}>Поведение</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => {
                const hasTaskTemplate = wizard.activityTemplates.some((template) => template.type === 'task');
                updateWizard({
                  activityTemplates: hasTaskTemplate
                    ? wizard.activityTemplates.filter((template) => template.type !== 'task')
                    : [...wizard.activityTemplates, { id: `template_task_${Date.now()}`, label: 'Задание', points: 3, type: 'task' }],
                });
              }}
            >
              <View style={[styles.checkBox, wizard.activityTemplates.some((template) => template.type === 'task') && styles.checkBoxActive]}>
                <Text style={styles.checkMark}>{wizard.activityTemplates.some((template) => template.type === 'task') ? '✓' : ''}</Text>
              </View>
              <Text style={styles.toggleLabel}>Задания</Text>
            </TouchableOpacity>
            <Card style={styles.summaryCard} padding="medium">
              <Text style={styles.summaryTitle}>Итог</Text>
              <Text style={styles.summaryLine}>Кабинет: {wizard.name || `Кабинет ${child?.name}`}</Text>
              <Text style={styles.summaryLine}>Период: {normalizeDateDisplay(wizard.startDate)} - {normalizeDateDisplay(wizard.endDate)}</Text>
              <Text style={styles.summaryLine}>Предметов: {wizard.subjects.length}</Text>
              <Text style={styles.summaryLine}>Оценки: {gradeSystemLabel}</Text>
            </Card>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button title="" onPress={() => router.back()} variant="ghost" icon={<ChevronLeft size={24} color={Colors.textPrimary} />} />
        <Text style={styles.headerTitle}>Новый кабинет</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Шаг {wizard.step} из {totalSteps}</Text>
        <ProgressBar progress={wizard.step / totalSteps} color={Colors.primary} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          {wizard.step > 1 && <Button title="Назад" onPress={prevStep} variant="outline" size="medium" />}
          {wizard.step < totalSteps ? (
            <Button title="Далее" onPress={nextStep} size="medium" disabled={!canContinue} />
          ) : (
            <Button title="Создать кабинет" onPress={handleCreateCabinet} loading={loading} size="large" />
          )}
        </View>
        {createError ? <Text style={styles.footerError}>{createError}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  progressContainer: { paddingHorizontal: 24, gap: 8, marginBottom: 8 },
  progressText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24 },
  stepContainer: { gap: 16 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  inputLabel: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  periodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  optionChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer },
  optionText: { color: Colors.textSecondary, fontWeight: '600' },
  optionTextActive: { color: Colors.primary, fontWeight: '800' },
  autoDateBox: {
    borderRadius: 12,
    backgroundColor: Colors.surfaceVariant,
    padding: 14,
    gap: 4,
  },
  autoDateLabel: { color: Colors.textSecondary, fontSize: 13 },
  autoDateValue: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800' },
  subjectsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subjectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  subjectChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer },
  subjectText: { color: Colors.textSecondary, fontSize: 14 },
  subjectTextSelected: { color: Colors.primary, fontWeight: '700' },
  inlineRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  subjectScheduleCard: { gap: 12 },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  subjectTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  subjectMeta: { fontSize: 12, color: Colors.primary, fontWeight: '800' },
  categoryButtonRow: { flexDirection: 'row', gap: 8 },
  categoryButton: {
    flex: 1,
    minHeight: 62,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  categoryButtonActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer },
  categoryTitle: { fontSize: 16, fontWeight: '800', color: Colors.textSecondary },
  categoryTitleActive: { color: Colors.primary },
  categoryHint: { fontSize: 10, color: Colors.textTertiary, textAlign: 'center' },
  weekRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weekdayChip: {
    width: 38,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayChipActive: { borderColor: Colors.study, backgroundColor: Colors.studyContainer },
  weekdayText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 12 },
  weekdayTextActive: { color: Colors.study },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  toggleLabel: { fontSize: 16, color: Colors.textPrimary, fontWeight: '700' },
  toggleValue: { color: Colors.primary, fontWeight: '800' },
  cancelValue: { color: Colors.textSecondary, fontWeight: '800' },
  weightActionRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  checkRow: {
    minHeight: 48,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer },
  checkMark: { color: Colors.primary, fontWeight: '900', fontSize: 16 },
  presetCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 14,
    gap: 8,
  },
  presetCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryContainer },
  presetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  presetTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  presetDescription: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
  templateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  templateName: { color: Colors.textPrimary, fontWeight: '700' },
  templatePoints: { color: Colors.success, fontWeight: '800' },
  templateList: { gap: 8 },
  pointsInput: { width: 84 },
  summaryCard: { gap: 8 },
  infoCard: { gap: 8 },
  scoreHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  weightEditRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  weightInput: { flex: 1 },
  scoreTable: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  scoreRow: { flexDirection: 'row', minHeight: 32, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider },
  scoreCellHead: { flex: 1, color: Colors.textPrimary, fontWeight: '900', textAlign: 'center', fontSize: 12 },
  scoreCell: { flex: 1, color: Colors.textSecondary, fontWeight: '700', textAlign: 'center', fontSize: 12 },
  summaryTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  summaryLine: { color: Colors.textSecondary, fontSize: 14 },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  footerError: {
    marginTop: 10,
    color: Colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
});

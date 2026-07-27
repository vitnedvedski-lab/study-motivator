import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Crown, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { GradeSelector } from '../../components/GradeSelector';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ActivityService } from '../../services/activityService';
import { ChildService } from '../../services/childService';
import { useAuthStore } from '../../stores/authStore';
import { useCabinetStore } from '../../stores/cabinetStore';
import { useChildStore } from '../../stores/childStore';
import { useUIStore } from '../../stores/uiStore';
import { compareDateStrings, formatDateISO } from '../../utils/datePeriod';
import { formatPoints, getGradeLabel, getGradeOptions } from '../../utils/gradeScoring';
import { getSubjectDisplayName } from '../../utils/subjects';
import { Activity, GradeSystem, Subject } from '../../types';
import { useAppText } from '../../hooks/useAppText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { getLevelByPoints } from '../../constants/levels';

const getDefaultGrade = (gradeSystem: GradeSystem): number => {
  if (gradeSystem === '10') return 10;
  if (gradeSystem === '12') return 12;
  return getGradeOptions(gradeSystem)[0]?.value ?? 5;
};

const getWeekStart = (date: Date) => {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
};

const TEMP_SUBJECTS_PREFIX = '@study_motivator_diary_temp_subjects:';
const DIARY_EXTRA: Record<string, {
  deleteError: string;
  deleteTitle: string;
  deleteText: string;
  delete: string;
  chooseDelete: string;
  chooseEdit: string;
  saveEdited: string;
}> = {
  ru: { deleteError: 'Не удалось удалить оценку.', deleteTitle: 'Удалить оценку?', deleteText: 'Баллы будут пересчитаны.', delete: 'Удалить', chooseDelete: 'Какая оценка ошибочная?', chooseEdit: 'Какую оценку изменить?', saveEdited: 'Сохранить оценку' },
  en: { deleteError: 'Could not delete the grade.', deleteTitle: 'Delete grade?', deleteText: 'Points will be recalculated.', delete: 'Delete', chooseDelete: 'Which grade is wrong?', chooseEdit: 'Which grade should be changed?', saveEdited: 'Save grade' },
  zh: { deleteError: '无法删除成绩。', deleteTitle: '删除成绩？', deleteText: '积分将重新计算。', delete: '删除', chooseDelete: '哪个成绩有误？', chooseEdit: '要修改哪个成绩？', saveEdited: '保存成绩' },
  fr: { deleteError: 'Impossible de supprimer la note.', deleteTitle: 'Supprimer la note ?', deleteText: 'Les points seront recalcules.', delete: 'Supprimer', chooseDelete: 'Quelle note est incorrecte ?', chooseEdit: 'Quelle note modifier ?', saveEdited: 'Enregistrer la note' },
  de: { deleteError: 'Note konnte nicht geloscht werden.', deleteTitle: 'Note loschen?', deleteText: 'Punkte werden neu berechnet.', delete: 'Loschen', chooseDelete: 'Welche Note ist falsch?', chooseEdit: 'Welche Note andern?', saveEdited: 'Note speichern' },
  it: { deleteError: 'Impossibile eliminare il voto.', deleteTitle: 'Eliminare il voto?', deleteText: 'I punti saranno ricalcolati.', delete: 'Elimina', chooseDelete: 'Quale voto e errato?', chooseEdit: 'Quale voto modificare?', saveEdited: 'Salva voto' },
  es: { deleteError: 'No se pudo eliminar la nota.', deleteTitle: 'Eliminar nota?', deleteText: 'Los puntos se recalcularan.', delete: 'Eliminar', chooseDelete: 'Que nota es incorrecta?', chooseEdit: 'Que nota cambiar?', saveEdited: 'Guardar nota' },
};

export default function DiaryScreen() {
  const { selectedChild, updateChild } = useChildStore();
  const { activeCabinet } = useCabinetStore();
  const { settings, updateSettings } = useUIStore();
  const { user } = useAuthStore();
  const { text, tr, lang } = useAppText();
  const extra = DIARY_EXTRA[lang] ?? DIARY_EXTRA.en;
  const palette = useAppTheme();
  const child = selectedChild();
  const cabinet = activeCabinet();
  // В детском режиме дневник работает только на просмотр.
  const isChildMode = settings.accessMode === 'child';
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [grade, setGrade] = useState(5);
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [temporarySubjectsByDate, setTemporarySubjectsByDate] = useState<Record<string, Subject[]>>({});
  const [temporarySubjectId, setTemporarySubjectId] = useState('');
  const [temporarySubjectPickerOpen, setTemporarySubjectPickerOpen] = useState(false);

  useEffect(() => {
    if (!child) return;
    return ActivityService.subscribeToActivities(child.id, setActivities);
  }, [child?.id]);

  useEffect(() => {
    let mounted = true;
    const loadTemporarySubjects = async () => {
      if (!cabinet) {
        setTemporarySubjectsByDate({});
        return;
      }

      try {
        const raw = await AsyncStorage.getItem(`${TEMP_SUBJECTS_PREFIX}${cabinet.id}`);
        if (mounted) setTemporarySubjectsByDate(raw ? JSON.parse(raw) : {});
      } catch (error) {
        console.error('Diary temporary subjects load error:', error);
        if (mounted) setTemporarySubjectsByDate({});
      }
    };

    loadTemporarySubjects();
    return () => {
      mounted = false;
    };
  }, [cabinet?.id]);

  const weekDays = useMemo(() => {
    const start = getWeekStart(selectedDate);
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [selectedDate]);

  const getSubjectsForDate = (date: Date) => {
    if (!cabinet) return [];
    const schedule = cabinet.schedule.find((item) => item.day === date.getDay());
    const scheduledSubjects = (schedule?.subjects ?? [])
      .map((id) => cabinet.subjects.find((subject) => subject.id === id))
      .filter(Boolean) as Subject[];
    const temporarySubjects = temporarySubjectsByDate[formatDateISO(date)] ?? [];

    return [...scheduledSubjects, ...temporarySubjects];
  };

  const daySubjects = useMemo(
    () => getSubjectsForDate(selectedDate),
    [cabinet?.id, cabinet?.schedule, cabinet?.subjects, selectedDate, temporarySubjectsByDate],
  );

  useEffect(() => {
    if (!cabinet) return;
    setTemporarySubjectId((current) =>
      current && cabinet.subjects.some((subject) => subject.id === current)
        ? current
        : cabinet.subjects[0]?.id ?? ''
    );
  }, [cabinet?.id, cabinet?.subjects]);

  const temporarySourceSubject = useMemo(
    () => cabinet?.subjects.find((subject) => subject.id === temporarySubjectId) ?? null,
    [cabinet?.subjects, temporarySubjectId],
  );

  const shiftDay = (delta: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta);
    if (cabinet) {
      const nextDate = formatDateISO(next);
      if (compareDateStrings(nextDate, cabinet.startDate) < 0 || compareDateStrings(nextDate, cabinet.endDate) > 0) {
        Alert.alert(text.diary.title, 'Дата вне периода текущего кабинета.');
        return;
      }
    }
    setSelectedDate(next);
    setSelectedSubject(null);
  };

  const shiftWeek = (delta: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta * 7);
    if (cabinet) {
      const nextDate = formatDateISO(next);
      if (compareDateStrings(nextDate, cabinet.startDate) < 0 || compareDateStrings(nextDate, cabinet.endDate) > 0) {
        Alert.alert(text.diary.title, 'Неделя вне периода текущего кабинета.');
        return;
      }
    }
    setSelectedDate(next);
    setSelectedSubject(null);
  };

  const handleSelectSubject = (subject: Subject, date = selectedDate) => {
    if (isChildMode) return;
    setSelectedDate(date);
    setSelectedSubject(subject);
    setGrade(getDefaultGrade(cabinet?.gradeSystem ?? '5'));
    setEditingActivity(null);
    setViewMode('day');
  };

  const openDay = (date: Date) => {
    if (cabinet) {
      const nextDate = formatDateISO(date);
      if (compareDateStrings(nextDate, cabinet.startDate) < 0 || compareDateStrings(nextDate, cabinet.endDate) > 0) {
        Alert.alert(text.diary.title, 'Дата вне периода текущего кабинета.');
        return;
      }
    }
    setSelectedDate(date);
    setSelectedSubject(null);
    setViewMode('day');
  };

  const getSubjectActivities = (subject: Subject, date: Date) => {
    const dateKey = formatDateISO(date);
    return activities.filter((activity) =>
      activity.type === 'study' &&
      activity.subjectId === subject.id &&
      activity.date === dateKey
    );
  };

  const getSubjectResult = (subject: Subject, date: Date) => {
    const rows = getSubjectActivities(subject, date);
    if (rows.length === 0) return { grades: '-', points: '-' };
    return {
      grades: rows.map((activity) => activity.gradeLabel ?? activity.grade ?? '-').join(' | '),
      points: formatPoints(rows.reduce((sum, activity) => sum + activity.points, 0)),
    };
  };

  const deleteGradeActivity = async (activity: Activity) => {
    if (!child) return;
    try {
      await ActivityService.deleteActivity(activity.id);
      const totalPoints = Math.max(0, (child.totalPoints ?? 0) - (activity.points ?? 0));
      const updates = {
        totalPoints,
        currentLevel: getLevelByPoints(totalPoints),
      };
      await ChildService.updateChild(child.id, updates);
      updateChild(child.id, updates);
    } catch (error) {
      console.error('Diary grade delete error:', error);
      Alert.alert(text.common.error, extra.deleteError);
    }
  };

  const handleDeleteSubjectGrade = (subject: Subject, date: Date) => {
    if (isChildMode) return;
    const rows = getSubjectActivities(subject, date);
    if (rows.length === 0) return;
    const confirmDelete = (activity: Activity) => {
      const label = activity.gradeLabel ?? activity.grade ?? '-';
      Alert.alert(
        extra.deleteTitle,
        `${getSubjectDisplayName(subject, lang)}: ${label}. ${extra.deleteText}`,
        [
          { text: text.common.cancel, style: 'cancel' },
          { text: extra.delete, style: 'destructive', onPress: () => deleteGradeActivity(activity) },
        ],
      );
    };
    if (rows.length === 1) {
      confirmDelete(rows[0]);
      return;
    }
    Alert.alert(
      extra.chooseDelete,
      getSubjectDisplayName(subject, lang),
      [
        { text: text.common.cancel, style: 'cancel' },
        ...rows.slice(0, 6).map((activity) => ({
          text: String(activity.gradeLabel ?? activity.grade ?? '-'),
          onPress: () => confirmDelete(activity),
        })),
      ],
    );
  };

  const handleEditSubjectGrade = (subject: Subject, date: Date) => {
    if (isChildMode) return;
    const rows = getSubjectActivities(subject, date);
    if (rows.length === 0) return;
    const openEditor = (activity: Activity) => {
      setSelectedDate(date);
      setSelectedSubject(subject);
      setEditingActivity(activity);
      setGrade(typeof activity.grade === 'number' ? activity.grade : getDefaultGrade(cabinet?.gradeSystem ?? '5'));
      setViewMode('day');
    };
    if (rows.length === 1) {
      openEditor(rows[0]);
      return;
    }
    Alert.alert(
      extra.chooseEdit,
      getSubjectDisplayName(subject, lang),
      [
        { text: text.common.cancel, style: 'cancel' },
        ...rows.slice(0, 6).map((activity) => ({
          text: String(activity.gradeLabel ?? activity.grade ?? '-'),
          onPress: () => openEditor(activity),
        })),
      ],
    );
  };

  const handleAddTemporarySubject = async () => {
    if (!cabinet || isChildMode) return;
    if (!temporarySourceSubject) {
      Alert.alert(text.common.error, text.diary.enterSubject);
      return;
    }

    const dateKey = formatDateISO(selectedDate);
    const subject: Subject = {
      id: `temp_${dateKey}_${Date.now()}`,
      name: temporarySourceSubject.name,
      nameRu: temporarySourceSubject.nameRu,
      nameEn: temporarySourceSubject.nameEn,
      nameZh: temporarySourceSubject.nameZh,
      category: temporarySourceSubject.category,
      custom: true,
    };
    const next = {
      ...temporarySubjectsByDate,
      [dateKey]: [...(temporarySubjectsByDate[dateKey] ?? []), subject],
    };

    try {
      setTemporarySubjectsByDate(next);
      await AsyncStorage.setItem(`${TEMP_SUBJECTS_PREFIX}${cabinet.id}`, JSON.stringify(next));
      setTemporarySubjectPickerOpen(false);
    } catch (error) {
      console.error('Diary temporary subject save error:', error);
      Alert.alert(text.common.error, text.diary.tempSubjectError);
    }
  };

  const handleSaveGrade = async () => {
    if (!child || !cabinet || !user || !selectedSubject) return;
    const gradeDate = formatDateISO(selectedDate);
    const today = formatDateISO(new Date());
    if (compareDateStrings(gradeDate, today) > 0) {
      Alert.alert(text.common.error, text.diary.futureGradeError);
      return;
    }
    if (compareDateStrings(gradeDate, cabinet.startDate) < 0 || compareDateStrings(gradeDate, cabinet.endDate) > 0) {
      Alert.alert(text.common.error, text.diary.dateOutsideCabinet);
      return;
    }
    setSaving(true);
    try {
      const activityData = {
        childId: child.id,
        cabinetId: cabinet.id,
        type: 'study' as const,
        subjectId: selectedSubject.id,
        subjectName: getSubjectDisplayName(selectedSubject, lang),
        subjectCategory: selectedSubject.category,
        grade,
        gradeLabel: getGradeLabel(cabinet.gradeSystem, grade),
        note: text.diary.fromDiary,
        date: gradeDate,
        createdBy: user.uid,
        points: 0,
      };
      const points = ActivityService.calculatePoints(activityData, cabinet);
      if (editingActivity) {
        await ActivityService.updateActivity(editingActivity.id, { ...activityData, points });
        const delta = points - (editingActivity.points ?? 0);
        const totalPoints = Math.max(0, (child.totalPoints ?? 0) + delta);
        const updates = { totalPoints, currentLevel: getLevelByPoints(totalPoints) };
        await ChildService.updateChild(child.id, updates);
        updateChild(child.id, updates);
      } else {
        await ActivityService.addActivity({ ...activityData, points });
        const childPointUpdates = await ChildService.applyPointsDelta(child.id, points);
        updateChild(child.id, childPointUpdates);
      }
      setSelectedSubject(null);
      setEditingActivity(null);
      Alert.alert(text.diary.gradeSaved, tr(text.diary.gradeSavedText, { points: `${points > 0 ? '+' : ''}${points}` }));
    } catch (error) {
      console.error('Diary grade save error:', error);
      Alert.alert(text.common.error, text.diary.gradeError);
    } finally {
      setSaving(false);
    }
  };

  const renderPaperHeader = () => (
    <View style={[styles.paperTableHeader, { borderBottomColor: palette.paperLine }]}>
      <Text style={[styles.lessonNumber, { color: palette.textTertiary }]}>№</Text>
      <Text style={[styles.lessonName, { color: palette.textSecondary }]}>{text.diary.subjectColumn}</Text>
      <Text style={[styles.lessonCategory, { color: palette.textSecondary }]}>{text.diary.categoryColumn}</Text>
      <Text style={[styles.resultHeaderCell, { color: palette.textSecondary }]}>{text.diary.gradeColumn}</Text>
      <Text style={[styles.resultHeaderCell, { color: palette.textSecondary }]}>{text.diary.pointsColumn}</Text>
      <Text style={[styles.actionsHeaderCell, { color: palette.textSecondary }]} />
    </View>
  );

  const renderSubjectRows = (subjects: Subject[], date: Date) => {
    if (subjects.length === 0) {
      return (
        <View style={[styles.paperLine, { borderBottomColor: palette.paperLine }]}>
          <Text style={[styles.noLessonText, { color: palette.textSecondary }]}>{text.diary.noLessons}</Text>
        </View>
      );
    }
    return subjects.map((subject, index) => {
      const result = getSubjectResult(subject, date);
      const hasGrades = getSubjectActivities(subject, date).length > 0;
      return (
        <TouchableOpacity key={`${date.toISOString()}_${subject.id}_${index}`} style={[styles.paperLine, { borderBottomColor: palette.paperLine }]} onPress={() => handleSelectSubject(subject, date)}>
          <Text style={[styles.lessonNumber, { color: palette.textTertiary }]}>{index + 1}</Text>
          <Text style={[styles.lessonName, { color: palette.textPrimary }]} numberOfLines={1}>{getSubjectDisplayName(subject, lang)}</Text>
          <Text style={[styles.lessonCategory, { color: palette.textSecondary }]}>{subject.category}</Text>
          <Text style={[styles.resultValue, styles.gradeValue, { color: palette.textPrimary }]} numberOfLines={1}>{result.grades}</Text>
          <Text style={[styles.resultValue, styles.pointsValue, { color: palette.primary }]} numberOfLines={1}>{result.points}</Text>
          <View style={styles.gradeActionsWrap}>
            {hasGrades && !isChildMode && (
              <>
                <TouchableOpacity style={styles.gradeActionButton} onPress={() => handleEditSubjectGrade(subject, date)}>
                  <Pencil size={13} color={palette.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.gradeActionButton} onPress={() => handleDeleteSubjectGrade(subject, date)}>
                  <Trash2 size={13} color={palette.danger} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      );
    });
  };

  if (!child || !cabinet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>{text.common.noChildCabinet}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (settings.subscription !== 'premium') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.premiumState}>
          <Crown size={42} color={palette.primary} />
          <Text style={[styles.title, { color: palette.textPrimary }]}>{text.diary.premiumTitle}</Text>
          <Text style={[styles.premiumText, { color: palette.textSecondary }]}>{text.diary.premiumText}</Text>
          <Button title={text.diary.activatePremium} onPress={() => updateSettings({ subscription: 'premium' })} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      onTouchStart={(event) => setSwipeStartX(event.nativeEvent.pageX)}
      onTouchEnd={(event) => {
        if (swipeStartX === null) return;
        const delta = event.nativeEvent.pageX - swipeStartX;
        if (Math.abs(delta) > 70) setViewMode(delta < 0 ? 'day' : 'week');
        setSwipeStartX(null);
      }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.textPrimary }]}>{text.diary.title}</Text>
        <View style={styles.modeSwitch}>
          {[
            { key: 'week' as const, label: text.diary.paperMode },
            { key: 'day' as const, label: text.diary.dayMode },
          ].map((mode) => {
            const active = viewMode === mode.key;
            return (
              <TouchableOpacity
                key={mode.key}
                style={[styles.modeButton, { borderColor: palette.border }, active && { backgroundColor: palette.primaryContainer, borderColor: palette.primary }]}
                onPress={() => setViewMode(mode.key)}
              >
                <Text style={[styles.modeText, { color: active ? palette.primary : palette.textSecondary }]}>{mode.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.daySwitcher}>
        <TouchableOpacity style={[styles.dayButton, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => viewMode === 'week' ? shiftWeek(-1) : shiftDay(-1)}>
          <ChevronLeft size={20} color={palette.primary} />
        </TouchableOpacity>
        <View style={[styles.datePill, { backgroundColor: palette.primaryContainer }]}>
          <CalendarDays size={16} color={palette.primary} />
          <Text style={[styles.dateText, { color: palette.primary }]} numberOfLines={1}>
            {viewMode === 'week'
              ? `${formatDateISO(weekDays[0])} - ${formatDateISO(weekDays[5])}`
              : `${text.diary.weekdays[selectedDate.getDay()]}, ${formatDateISO(selectedDate)}`}
          </Text>
        </View>
        <TouchableOpacity style={[styles.dayButton, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => viewMode === 'week' ? shiftWeek(1) : shiftDay(1)}>
          <ChevronRight size={20} color={palette.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {viewMode === 'week' ? (
          <View style={[styles.paperBook, { backgroundColor: palette.paper, borderColor: palette.paperLine }]}>
            {weekDays.map((date, index) => {
              const subjects = getSubjectsForDate(date);
              return (
                <View key={formatDateISO(date)} style={[styles.paperDay, { borderColor: palette.paperLine }]}>
                  <TouchableOpacity style={styles.paperDayHeader} onPress={() => openDay(date)}>
                    <Text style={[styles.paperDayName, { color: palette.textPrimary }]}>{text.diary.schoolWeekdays[index]}</Text>
                    <Text style={[styles.paperDate, { color: palette.textSecondary }]}>{formatDateISO(date)}</Text>
                  </TouchableOpacity>
                  {renderPaperHeader()}
                  {renderSubjectRows(subjects, date)}
                </View>
              );
            })}
          </View>
        ) : daySubjects.length === 0 ? (
          <Card style={styles.emptyDayCard}>
            <Text style={[styles.emptyDayTitle, { color: palette.textPrimary }]}>{text.diary.noLessons}</Text>
            <Text style={[styles.emptyDayText, { color: palette.textSecondary }]}>{text.diary.noLessonsText}</Text>
          </Card>
        ) : (
          <View style={[styles.paperBook, { backgroundColor: palette.paper, borderColor: palette.paperLine }]}>
            <View style={[styles.paperDay, { borderColor: palette.paperLine }]}>
              <View style={styles.paperDayHeader}>
                <Text style={[styles.paperDayName, { color: palette.textPrimary }]}>{text.diary.weekdays[selectedDate.getDay()]}</Text>
                <Text style={[styles.paperDate, { color: palette.textSecondary }]}>{formatDateISO(selectedDate)}</Text>
              </View>
              {renderPaperHeader()}
              {renderSubjectRows(daySubjects, selectedDate)}
            </View>
          </View>
        )}

        {selectedSubject && (
          <Card style={styles.gradeCard}>
            <Text style={[styles.gradeTitle, { color: palette.textPrimary }]}>{getSubjectDisplayName(selectedSubject, lang)}</Text>
            <GradeSelector gradeSystem={cabinet.gradeSystem} selectedGrade={grade} onSelect={setGrade} />
            <Button title={editingActivity ? extra.saveEdited : text.diary.saveGrade} onPress={handleSaveGrade} loading={saving} size="large" />
          </Card>
        )}

        {viewMode === 'day' && !isChildMode && (
          <Card style={[styles.temporaryCard, { backgroundColor: palette.surface }]}>
            <Text style={[styles.temporaryTitle, { color: palette.textPrimary }]}>{text.diary.tempSubjectTitle}</Text>
            <View>
              <TouchableOpacity
                style={[styles.subjectSelect, { backgroundColor: palette.surface, borderColor: palette.border }]}
                onPress={() => setTemporarySubjectPickerOpen((value) => !value)}
              >
                <Text style={[styles.subjectSelectText, { color: palette.textPrimary }]} numberOfLines={1}>
                  {getSubjectDisplayName(temporarySourceSubject, lang) || text.diary.tempSubjectPlaceholder}
                </Text>
                <Text style={[styles.subjectCategoryBadge, { color: palette.primary, backgroundColor: palette.primaryContainer }]}>
                  {temporarySourceSubject?.category ?? '-'}
                </Text>
                <ChevronDown size={18} color={palette.textSecondary} />
              </TouchableOpacity>
              {temporarySubjectPickerOpen && (
                <View style={[styles.subjectDropdown, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  {cabinet.subjects.map((subject) => {
                    const active = temporarySubjectId === subject.id;
                    return (
                      <TouchableOpacity
                        key={subject.id}
                        style={styles.subjectOption}
                        onPress={() => {
                          setTemporarySubjectId(subject.id);
                          setTemporarySubjectPickerOpen(false);
                        }}
                      >
                        <Text style={[styles.subjectText, { color: active ? palette.primary : palette.textPrimary }]} numberOfLines={1}>
                          {getSubjectDisplayName(subject, lang)}
                        </Text>
                        <Text style={[styles.subjectOptionCategory, { color: palette.textSecondary }]}>{subject.category}</Text>
                        {active && <Check size={16} color={palette.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
            <Button
              title={text.diary.addTempSubject}
              onPress={handleAddTemporarySubject}
              icon={<Plus size={18} color="#FFFFFF" />}
            />
          </Card>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 10 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  modeSwitch: { flexDirection: 'row', gap: 8 },
  modeButton: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1 },
  modeText: { fontWeight: '800', fontSize: 13 },
  daySwitcher: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingBottom: 10 },
  dayButton: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  datePill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9 },
  dateText: { fontWeight: '700', fontSize: 13 },
  content: { padding: 20, gap: 16, paddingBottom: 100 },
  paperBook: { borderWidth: 1, borderRadius: 6, padding: 10, gap: 10 },
  paperDay: { borderWidth: 1, borderRadius: 4, overflow: 'hidden' },
  paperDayHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 },
  paperDayName: { fontSize: 15, fontWeight: '900' },
  paperDate: { fontSize: 12, fontWeight: '700' },
  paperTableHeader: { minHeight: 30, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8 },
  paperLine: { minHeight: 38, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8 },
  lessonNumber: { width: 18, fontWeight: '800' },
  lessonName: { flex: 1, fontWeight: '700' },
  lessonCategory: { width: 34, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  resultHeaderCell: { width: 54, fontSize: 11, fontWeight: '900', textAlign: 'center' },
  actionsHeaderCell: { width: 44 },
  resultValue: { fontSize: 12, fontWeight: '900', textAlign: 'center' },
  gradeValue: { width: 54 },
  pointsValue: { width: 54 },
  gradeActionsWrap: { width: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  gradeActionButton: { width: 19, height: 22, alignItems: 'center', justifyContent: 'center' },
  noLessonText: { fontStyle: 'italic' },
  emptyDayCard: { padding: 28, alignItems: 'center', gap: 8 },
  emptyDayTitle: { fontSize: 18, fontWeight: '800' },
  emptyDayText: { textAlign: 'center', lineHeight: 20 },
  temporaryCard: { padding: 16, gap: 12 },
  temporaryTitle: { fontSize: 16, fontWeight: '800' },
  subjectSelect: { minHeight: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  subjectSelectText: { flex: 1, fontSize: 15, fontWeight: '800' },
  subjectCategoryBadge: { minWidth: 30, textAlign: 'center', overflow: 'hidden', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontWeight: '900' },
  subjectDropdown: { marginTop: 8, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  subjectOption: { minHeight: 42, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  subjectText: { flex: 1, fontSize: 14, fontWeight: '700' },
  subjectOptionCategory: { width: 24, textAlign: 'center', fontWeight: '900' },
  gradeCard: { padding: 16, gap: 14 },
  gradeTitle: { fontSize: 18, fontWeight: '800' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { textAlign: 'center', fontSize: 16 },
  premiumState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  premiumText: { textAlign: 'center', lineHeight: 20 },
});

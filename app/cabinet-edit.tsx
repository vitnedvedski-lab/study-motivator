import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DEFAULT_SUBJECTS } from '../constants/subjects';
import { getLevelByPoints } from '../constants/levels';
import { ActivityService } from '../services/activityService';
import { CabinetService } from '../services/cabinetService';
import { ChildService } from '../services/childService';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAppText } from '../hooks/useAppText';
import { useCabinetStore } from '../stores/cabinetStore';
import { useChildStore } from '../stores/childStore';
import { GradeSystem, ScheduleDay, Subject, SubjectCategory } from '../types';
import { getSubjectDisplayName } from '../utils/subjects';

const GRADE_SYSTEMS: { value: GradeSystem; label: string }[] = [
  { value: '5', label: '5-балльная' },
  { value: '10', label: '10-балльная' },
  { value: '12', label: '12-балльная' },
  { value: 'letter', label: 'A-F' },
  { value: 'percent', label: '0-100%' },
  { value: 'gpa', label: 'GPA' },
];

const CATEGORIES: SubjectCategory[] = ['A', 'B', 'C'];
const WEEKDAYS = [
  { day: 1, label: 'Пн' },
  { day: 2, label: 'Вт' },
  { day: 3, label: 'Ср' },
  { day: 4, label: 'Чт' },
  { day: 5, label: 'Пт' },
  { day: 6, label: 'Сб' },
  { day: 0, label: 'Вс' },
];
const COPY: Record<string, {
  title: string;
  gradeSystem: string;
  cabinetSubjects: string;
  addRemoveSubject: string;
  save: string;
  notFound: string;
  cabinet: string;
  keepOneSubject: string;
  saveError: string;
}> = {
  ru: { title: 'Редактировать кабинет', gradeSystem: 'Система оценок', cabinetSubjects: 'Предметы кабинета', addRemoveSubject: 'Добавить или убрать предмет', save: 'Сохранить', notFound: 'Кабинет не найден.', cabinet: 'Кабинет', keepOneSubject: 'Оставьте хотя бы один предмет.', saveError: 'Не удалось сохранить изменения.' },
  en: { title: 'Edit cabinet', gradeSystem: 'Grade system', cabinetSubjects: 'Cabinet subjects', addRemoveSubject: 'Add or remove subject', save: 'Save', notFound: 'Cabinet not found.', cabinet: 'Cabinet', keepOneSubject: 'Keep at least one subject.', saveError: 'Could not save changes.' },
  zh: { title: '编辑档案', gradeSystem: '评分系统', cabinetSubjects: '档案科目', addRemoveSubject: '添加或移除科目', save: '保存', notFound: '未找到档案。', cabinet: '档案', keepOneSubject: '请至少保留一个科目。', saveError: '无法保存更改。' },
  fr: { title: 'Modifier le dossier', gradeSystem: 'Systeme de notes', cabinetSubjects: 'Matieres du dossier', addRemoveSubject: 'Ajouter ou retirer une matiere', save: 'Enregistrer', notFound: 'Dossier introuvable.', cabinet: 'Dossier', keepOneSubject: 'Gardez au moins une matiere.', saveError: 'Impossible d enregistrer.' },
  de: { title: 'Kabinett bearbeiten', gradeSystem: 'Notensystem', cabinetSubjects: 'Facher', addRemoveSubject: 'Fach hinzufugen oder entfernen', save: 'Speichern', notFound: 'Kabinett nicht gefunden.', cabinet: 'Kabinett', keepOneSubject: 'Mindestens ein Fach behalten.', saveError: 'Anderungen konnten nicht gespeichert werden.' },
  it: { title: 'Modifica scheda', gradeSystem: 'Sistema voti', cabinetSubjects: 'Materie', addRemoveSubject: 'Aggiungi o rimuovi materia', save: 'Salva', notFound: 'Scheda non trovata.', cabinet: 'Scheda', keepOneSubject: 'Mantieni almeno una materia.', saveError: 'Impossibile salvare.' },
  es: { title: 'Editar gabinete', gradeSystem: 'Sistema de notas', cabinetSubjects: 'Materias', addRemoveSubject: 'Agregar o quitar materia', save: 'Guardar', notFound: 'Gabinete no encontrado.', cabinet: 'Gabinete', keepOneSubject: 'Mantenga al menos una materia.', saveError: 'No se pudieron guardar los cambios.' },
};

export default function CabinetEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const palette = useAppTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { lang } = useAppText();
  const copy = COPY[lang] ?? COPY.en;
  const { cabinets, updateCabinet } = useCabinetStore();
  const { children, updateChild } = useChildStore();
  const cabinet = cabinets.find((item) => item.id === id);
  const child = children.find((item) => item.id === cabinet?.childId);
  const [subjects, setSubjects] = useState<Subject[]>(cabinet?.subjects ?? []);
  const [schedule, setSchedule] = useState<ScheduleDay[]>(cabinet?.schedule ?? []);
  const [gradeSystem, setGradeSystem] = useState<GradeSystem>(cabinet?.gradeSystem ?? '5');
  const [saving, setSaving] = useState(false);

  const toggleSubject = (source: Omit<Subject, 'id' | 'custom'>) => {
    const existing = subjects.find((item) => item.nameRu === source.nameRu || item.nameEn === source.nameEn);
    if (existing) {
      setSubjects((items) => items.filter((item) => item.id !== existing.id));
      setSchedule((items) => items.map((day) => ({ ...day, subjects: day.subjects.filter((subjectId) => subjectId !== existing.id) })));
      return;
    }
    setSubjects((items) => [
      ...items,
      {
        ...source,
        id: `edit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        custom: false,
      },
    ]);
  };

  const setCategory = (subjectId: string, category: SubjectCategory) => {
    setSubjects((items) => items.map((subject) => subject.id === subjectId ? { ...subject, category } : subject));
  };

  const toggleScheduleSubject = (day: number, subjectId: string) => {
    setSchedule((items) => {
      const existing = items.find((item) => item.day === day);
      if (!existing) return [...items, { day, subjects: [subjectId] }];
      const active = existing.subjects.includes(subjectId);
      return items.map((item) =>
        item.day === day
          ? { ...item, subjects: active ? item.subjects.filter((id) => id !== subjectId) : [...item.subjects, subjectId] }
          : item
      );
    });
  };

  const handleSave = async () => {
    if (!cabinet) return;
    if (subjects.length === 0) {
      Alert.alert(copy.cabinet, copy.keepOneSubject);
      return;
    }
    setSaving(true);
    try {
      const subjectIds = new Set(subjects.map((subject) => subject.id));
      const nextSchedule = schedule.map((day) => ({
        ...day,
        subjects: day.subjects.filter((subjectId) => subjectIds.has(subjectId)),
      }));
      const updates = { subjects, gradeSystem, schedule: nextSchedule };
      const updatedCabinet = { ...cabinet, ...updates };
      const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
      const studyActivities = (await ActivityService.getActivitiesByChild(cabinet.childId))
        .filter((activity) => activity.cabinetId === cabinet.id && activity.type === 'study');
      let pointsDelta = 0;
      await Promise.all(studyActivities.map(async (activity) => {
        const subject = activity.subjectId ? subjectById.get(activity.subjectId) : undefined;
        if (!subject) return;
        const points = ActivityService.calculatePoints(
          { ...activity, subjectCategory: subject.category },
          updatedCabinet,
        );
        pointsDelta += points - activity.points;
        await ActivityService.updateActivity(activity.id, {
          subjectCategory: subject.category,
          subjectName: getSubjectDisplayName(subject, lang),
          points,
        });
      }));
      await CabinetService.updateCabinet(cabinet.id, updates);
      updateCabinet(cabinet.id, updates);
      if (child && pointsDelta !== 0) {
        const totalPoints = Math.max(0, (child.totalPoints ?? 0) + pointsDelta);
        const currentLevel = getLevelByPoints(totalPoints);
        await ChildService.updateChild(child.id, { totalPoints, currentLevel });
        updateChild(child.id, { totalPoints, currentLevel });
      }
      router.back();
    } catch (error) {
      console.error('Cabinet edit error:', error);
      Alert.alert(copy.cabinet, copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  if (!cabinet) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyText}>{copy.notFound}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button title="" variant="ghost" onPress={() => router.back()} icon={<ChevronLeft size={24} color={palette.textPrimary} />} />
        <Text style={styles.headerTitle}>{copy.title}</Text>
        <View style={{ width: 48 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>{copy.gradeSystem}</Text>
        <View style={styles.grid}>
          {GRADE_SYSTEMS.map((system) => {
            const active = gradeSystem === system.value;
            return (
              <TouchableOpacity key={system.value} style={[styles.chip, active && styles.chipActive]} onPress={() => setGradeSystem(system.value)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{system.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>{copy.cabinetSubjects}</Text>
        <Card style={styles.card}>
          {subjects.map((subject) => (
            <View key={subject.id} style={styles.subjectBlock}>
              <View style={styles.subjectRow}>
                <Text style={styles.subjectName} numberOfLines={1}>{getSubjectDisplayName(subject, lang)}</Text>
                <View style={styles.categoryRow}>
                  {CATEGORIES.map((category) => {
                    const active = subject.category === category;
                    return (
                      <TouchableOpacity key={category} style={[styles.categoryChip, active && styles.categoryChipActive]} onPress={() => setCategory(subject.id, category)}>
                        <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{category}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={styles.weekRow}>
                {WEEKDAYS.map((weekday) => {
                  const active = schedule.find((item) => item.day === weekday.day)?.subjects.includes(subject.id);
                  return (
                    <TouchableOpacity key={weekday.day} style={[styles.weekdayChip, active && styles.weekdayChipActive]} onPress={() => toggleScheduleSubject(weekday.day, subject.id)}>
                      <Text style={[styles.weekdayText, active && styles.weekdayTextActive]}>{weekday.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </Card>

        <Text style={styles.sectionTitle}>{copy.addRemoveSubject}</Text>
        <View style={styles.grid}>
          {DEFAULT_SUBJECTS.map((subject) => {
            const active = subjects.some((item) => item.nameRu === subject.nameRu || item.nameEn === subject.nameEn);
            return (
              <TouchableOpacity key={subject.nameRu} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleSubject(subject)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>{getSubjectDisplayName(subject, lang)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button title={copy.save} onPress={handleSave} loading={saving} size="large" />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (palette: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: palette.textPrimary },
  content: { padding: 20, gap: 14, paddingBottom: 110 },
  sectionTitle: { color: palette.textPrimary, fontSize: 16, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 38, maxWidth: '48%', borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: 10, justifyContent: 'center', paddingHorizontal: 12 },
  chipActive: { borderColor: palette.primary, backgroundColor: palette.primaryContainer },
  chipText: { color: palette.textSecondary, fontWeight: '800', fontSize: 13 },
  chipTextActive: { color: palette.primary },
  card: { gap: 10 },
  subjectBlock: { gap: 8 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subjectName: { flex: 1, color: palette.textPrimary, fontWeight: '800' },
  categoryRow: { flexDirection: 'row', gap: 6 },
  categoryChip: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center' },
  categoryChipActive: { borderColor: palette.primary, backgroundColor: palette.primaryContainer },
  categoryText: { color: palette.textSecondary, fontWeight: '900' },
  categoryTextActive: { color: palette.primary },
  weekRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  weekdayChip: { width: 36, height: 30, borderRadius: 8, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center' },
  weekdayChipActive: { borderColor: palette.study, backgroundColor: palette.studyContainer },
  weekdayText: { color: palette.textSecondary, fontSize: 11, fontWeight: '800' },
  weekdayTextActive: { color: palette.study },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: palette.divider, backgroundColor: palette.surface },
  emptyText: { color: palette.textSecondary, textAlign: 'center', marginTop: 60 },
});

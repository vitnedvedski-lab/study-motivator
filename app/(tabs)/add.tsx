import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookOpen, Check, CheckSquare, ChevronDown, Dumbbell, Smile, Trash2 } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { DateInput } from '../../components/DateInput';
import { GradeSelector } from '../../components/GradeSelector';
import { Button } from '../../components/ui/Button';
import { Confetti } from '../../components/ui/Confetti';
import { Input } from '../../components/ui/Input';
import { ActivityService } from '../../services/activityService';
import { ChildService } from '../../services/childService';
import { ParentTaskService } from '../../services/parentTaskService';
import { useAuthStore } from '../../stores/authStore';
import { useCabinetStore } from '../../stores/cabinetStore';
import { useChildStore } from '../../stores/childStore';
import { useUIStore } from '../../stores/uiStore';
import { compareDateStrings, formatDateISO } from '../../utils/datePeriod';
import { formatPoints, getGradeLabel, getGradeOptions } from '../../utils/gradeScoring';
import { getSubjectDisplayName } from '../../utils/subjects';
import { GradeSystem, ParentTask } from '../../types';
import { useAppText } from '../../hooks/useAppText';
import { useAppTheme } from '../../hooks/useAppTheme';

type TabType = 'study' | 'sport' | 'behavior' | 'task';

const SPORT_TYPES = {
  ru: ['Бег', 'Плавание', 'Футбол', 'Баскетбол', 'Велосипед', 'Гимнастика', 'Теннис', 'Йога', 'Другое'],
  en: ['Running', 'Swimming', 'Football', 'Basketball', 'Bike', 'Gymnastics', 'Tennis', 'Yoga', 'Other'],
  zh: ['跑步', '游泳', '足球', '篮球', '骑行', '体操', '网球', '瑜伽', '其他'],
};

const COPY = {
  ru: {
    custom: 'Свой вариант',
    customSportPlaceholder: 'Например: танцы',
    noScheduledSubjects: 'На выбранную дату предметов по расписанию нет.',
    chooseSubject: 'Выберите предмет',
    enterTask: 'Введите название задания.',
    invalidTaskPoints: 'Укажите количество баллов больше 0.',
    taskDueOutside: 'Срок задания должен быть внутри периода текущего кабинета.',
    taskCreatedTitle: 'Задание',
    taskCreatedText: 'Задание создано и появилось во вкладке активных.',
    futureDate: 'Нельзя ставить оценки и баллы за будущие даты.',
    dateOutside: 'Дата должна быть внутри периода текущего кабинета.',
    noSubjectForDate: 'На выбранную дату нет доступного предмета.',
    closeTaskOutside: 'Задание можно закрыть только внутри периода текущего кабинета.',
    completeTaskError: 'Не удалось закрыть задание.',
    taskDoneNote: 'Задание выполнено. Срок: {{date}}',
    active: 'Активные',
    create: 'Создать',
    noActiveTasks: 'Активных заданий пока нет.',
    due: 'Срок',
    done: 'Готово',
    dueDate: 'Срок выполнения',
    createTask: 'Создать задание',
  },
  en: {
    custom: 'Custom',
    customSportPlaceholder: 'Example: dance',
    noScheduledSubjects: 'There are no scheduled subjects for this date.',
    chooseSubject: 'Choose a subject',
    enterTask: 'Enter a task name.',
    invalidTaskPoints: 'Enter more than 0 points.',
    taskDueOutside: 'Task due date must be inside the current cabinet period.',
    taskCreatedTitle: 'Task',
    taskCreatedText: 'The task was created and added to active tasks.',
    futureDate: 'You cannot add grades or points for future dates.',
    dateOutside: 'Date must be inside the current cabinet period.',
    noSubjectForDate: 'No subject is available for the selected date.',
    closeTaskOutside: 'A task can only be completed inside the current cabinet period.',
    completeTaskError: 'Could not complete the task.',
    taskDoneNote: 'Task completed. Due date: {{date}}',
    active: 'Active',
    create: 'Create',
    noActiveTasks: 'No active tasks yet.',
    due: 'Due',
    done: 'Done',
    dueDate: 'Due date',
    createTask: 'Create task',
  },
  zh: {
    custom: '自定义',
    customSportPlaceholder: '例如：舞蹈',
    noScheduledSubjects: '所选日期没有课程科目。',
    chooseSubject: '选择科目',
    enterTask: '请输入任务名称。',
    invalidTaskPoints: '请输入大于0的积分。',
    taskDueOutside: '任务截止日期必须在当前档案周期内。',
    taskCreatedTitle: '任务',
    taskCreatedText: '任务已创建并加入活动任务。',
    futureDate: '不能为未来日期添加成绩或积分。',
    dateOutside: '日期必须在当前档案周期内。',
    noSubjectForDate: '所选日期没有可用科目。',
    closeTaskOutside: '任务只能在当前档案周期内完成。',
    completeTaskError: '无法完成任务。',
    taskDoneNote: '任务已完成。截止日期：{{date}}',
    active: '活动',
    create: '创建',
    noActiveTasks: '暂无活动任务。',
    due: '截止',
    done: '完成',
    dueDate: '截止日期',
    createTask: '创建任务',
  },
};

const GOOD_BEHAVIOR_POINTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const BAD_BEHAVIOR_POINTS = [0, -1, -2, -3, -4, -5];

const getDefaultGrade = (gradeSystem: GradeSystem): number => {
  if (gradeSystem === '10') return 10;
  if (gradeSystem === '12') return 12;
  return getGradeOptions(gradeSystem)[0]?.value ?? 5;
};

export default function AddActivityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialTab = (params.tab as TabType) ?? 'study';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const { selectedChild, updateChild } = useChildStore();
  const { activeCabinet } = useCabinetStore();
  const { user } = useAuthStore();
  const { text, tr, lang } = useAppText();
  const copy = COPY[lang as keyof typeof COPY] ?? COPY.en;
  const palette = useAppTheme();
  const child = selectedChild();
  const cabinet = activeCabinet();
  const isChildMode = useUIStore((state) => state.settings.accessMode === 'child');

  const [activityDate, setActivityDate] = useState(formatDateISO(new Date()));
  const [subjectId, setSubjectId] = useState('');
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [grade, setGrade] = useState(5);
  const [sportType, setSportType] = useState('');
  const [sportPickerOpen, setSportPickerOpen] = useState(false);
  const [customSportType, setCustomSportType] = useState('');
  const [sportPoints, setSportPoints] = useState(5);
  const [behaviorType, setBehaviorType] = useState<'good' | 'bad'>('good');
  const [behaviorPoints, setBehaviorPoints] = useState(5);
  const [taskName, setTaskName] = useState('');
  const [taskPoints, setTaskPoints] = useState('5');
  const [taskDueDate, setTaskDueDate] = useState(formatDateISO(new Date()));
  const [taskMode, setTaskMode] = useState<'active' | 'create'>('active');
  const [activeTasks, setActiveTasks] = useState<ParentTask[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const tabs: { key: TabType; label: string; icon: any; color: string; container: string }[] = [
    { key: 'study', label: text.add.study, icon: BookOpen, color: Colors.study, container: palette.studyContainer },
    { key: 'sport', label: text.add.sport, icon: Dumbbell, color: Colors.sport, container: palette.sportContainer },
    { key: 'behavior', label: text.add.behavior, icon: Smile, color: Colors.behavior, container: palette.behaviorContainer },
    { key: 'task', label: text.add.task, icon: CheckSquare, color: Colors.tasks, container: palette.tasksContainer },
  ];

  useEffect(() => {
    if (!cabinet) return;
    setGrade(getDefaultGrade(cabinet.gradeSystem));
    setSubjectId((currentSubjectId) =>
      currentSubjectId && cabinet.subjects.some((subject) => subject.id === currentSubjectId)
        ? currentSubjectId
        : cabinet.subjects[0]?.id ?? ''
    );
  }, [cabinet?.id, cabinet?.gradeSystem]);

  const loadParentTasks = async () => {
    if (!child || !cabinet) return;
    const tasks = await ParentTaskService.getTasks(child.id, cabinet.id);
    setActiveTasks(tasks.filter((task) => task.status === 'active'));
  };

  useEffect(() => {
    loadParentTasks();
  }, [child?.id, cabinet?.id]);

  const selectedSubject = useMemo(
    () => cabinet?.subjects.find((subject) => subject.id === subjectId),
    [cabinet?.subjects, subjectId]
  );

  const sportOptions = SPORT_TYPES[lang as keyof typeof SPORT_TYPES] ?? SPORT_TYPES.en;
  const selectedSportLabel = sportType === '__custom__'
    ? customSportType.trim() || copy.custom
    : sportType || sportOptions[0] || text.activity.sportFallback;
  const effectiveSportType = sportType === '__custom__' ? customSportType.trim() : sportType || sportOptions[0];

  const scheduledSubjects = useMemo(() => {
    if (!cabinet) return [];
    const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(activityDate);
    const day = match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).getDay() : new Date().getDay();
    const schedule = cabinet.schedule.find((item) => item.day === day);
    const ids = schedule?.subjects ?? [];
    return ids.map((id) => cabinet.subjects.find((subject) => subject.id === id)).filter(Boolean) as typeof cabinet.subjects;
  }, [activityDate, cabinet?.id, cabinet?.schedule, cabinet?.subjects]);

  useEffect(() => {
    if (activeTab !== 'study') return;
    if (scheduledSubjects.length === 0) {
      setSubjectId('');
      return;
    }
    if (!scheduledSubjects.some((subject) => subject.id === subjectId)) {
      setSubjectId(scheduledSubjects[0].id);
    }
  }, [activeTab, scheduledSubjects, subjectId]);

  const previewPoints = useMemo(() => {
    if (!cabinet) return 0;
    if (activeTab === 'behavior') return behaviorPoints;
    if (activeTab === 'task') return taskMode === 'create' ? parseInt(taskPoints, 10) || 0 : 0;
    if (activeTab === 'sport') return sportPoints;
    return ActivityService.calculatePoints({ type: activeTab, grade, subjectCategory: selectedSubject?.category ?? 'C' }, cabinet);
  }, [activeTab, behaviorPoints, cabinet, grade, selectedSubject?.category, sportPoints, taskMode, taskPoints]);

  const handleCreateParentTask = async () => {
    if (!child || !cabinet) return;
    const points = parseInt(taskPoints, 10) || 0;
    if (!taskName.trim()) {
      Alert.alert(text.common.error, copy.enterTask);
      return;
    }
    if (points <= 0) {
      Alert.alert(text.common.error, copy.invalidTaskPoints);
      return;
    }
    if (compareDateStrings(taskDueDate, cabinet.startDate) < 0 || compareDateStrings(taskDueDate, cabinet.endDate) > 0) {
      Alert.alert(text.common.error, copy.taskDueOutside);
      return;
    }
    setLoading(true);
    try {
      await ParentTaskService.createTask({ childId: child.id, cabinetId: cabinet.id, name: taskName.trim(), points, dueDate: taskDueDate });
      await loadParentTasks();
      setTaskName('');
      setTaskPoints('5');
      setTaskDueDate(formatDateISO(new Date()));
      setTaskMode('active');
      Alert.alert(copy.taskCreatedTitle, copy.taskCreatedText);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!child || !cabinet || !user) return;
    if (activeTab === 'task' && taskMode === 'create') {
      await handleCreateParentTask();
      return;
    }

    const today = formatDateISO(new Date());
    if (compareDateStrings(activityDate, today) > 0) {
      Alert.alert(text.common.error, copy.futureDate);
      return;
    }
    if (compareDateStrings(activityDate, cabinet.startDate) < 0 || compareDateStrings(activityDate, cabinet.endDate) > 0) {
      Alert.alert(text.common.error, copy.dateOutside);
      return;
    }
    if (activeTab === 'study' && !selectedSubject) {
      Alert.alert(text.common.error, copy.noSubjectForDate);
      return;
    }

    setLoading(true);
    try {
      let activityData: any = { childId: child.id, cabinetId: cabinet.id, type: activeTab, note, date: activityDate, createdBy: user.uid };
      if (activeTab === 'study') {
        activityData = {
          ...activityData,
          subjectId: selectedSubject?.id ?? subjectId,
          subjectName: getSubjectDisplayName(selectedSubject, lang) || text.activity.subject,
          subjectCategory: selectedSubject?.category ?? 'C',
          grade,
          gradeLabel: getGradeLabel(cabinet.gradeSystem, grade),
        };
      } else if (activeTab === 'sport') {
        activityData = { ...activityData, sportType: effectiveSportType || text.activity.sportFallback, points: sportPoints };
      } else if (activeTab === 'behavior') {
        activityData = { ...activityData, behaviorType, behaviorNote: note, points: behaviorPoints };
      }

      const points = ActivityService.calculatePoints(activityData, cabinet);
      activityData.points = points;
      await ActivityService.addActivity(activityData);
      const childPointUpdates = await ChildService.applyPointsDelta(child.id, points);
      updateChild(child.id, childPointUpdates);
      if (points > 0) setShowConfetti(true);
      setGrade(getDefaultGrade(cabinet.gradeSystem));
      setSportType('');
      setCustomSportType('');
      setSportPickerOpen(false);
      setSportPoints(5);
      setBehaviorType('good');
      setBehaviorPoints(5);
      setNote('');
      const reason = activeTab === 'study'
        ? `${getSubjectDisplayName(selectedSubject, lang) || text.activity.subject} - ${getGradeLabel(cabinet.gradeSystem, grade)}`
        : activeTab === 'sport'
          ? effectiveSportType || text.activity.sportFallback
          : behaviorType === 'good'
            ? text.activity.goodBehavior
            : text.activity.badBehavior;
      Alert.alert(text.common.save, `${reason}\n${points > 0 ? '+' : ''}${formatPoints(points)} ${text.common.points}`);
    } catch (err) {
      console.error('Error adding activity:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteParentTask = async (task: ParentTask) => {
    if (!child || !cabinet || !user) return;
    const today = formatDateISO(new Date());
    if (compareDateStrings(today, cabinet.startDate) < 0 || compareDateStrings(today, cabinet.endDate) > 0) {
      Alert.alert(text.common.error, copy.closeTaskOutside);
      return;
    }
    setLoading(true);
    try {
      const activityData = {
        childId: child.id,
        cabinetId: cabinet.id,
        type: 'task' as const,
        taskName: task.name,
        taskCompleted: true,
        points: task.points,
        note: '',
        date: today,
        createdBy: user.uid,
      };
      await ActivityService.addActivity(activityData);
      await ParentTaskService.completeTask(task.id);
      const childPointUpdates = await ChildService.applyPointsDelta(child.id, task.points);
      updateChild(child.id, childPointUpdates);
      await loadParentTasks();
      setShowConfetti(task.points > 0);
      Alert.alert(copy.done, `${task.name}\n+${formatPoints(task.points)} ${text.common.points}`);
    } catch (error) {
      console.error('Complete parent task error:', error);
      Alert.alert(text.common.error, copy.completeTaskError);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteParentTask = async (task: ParentTask) => {
    setLoading(true);
    try {
      await ParentTaskService.deleteTask(task.id);
      await loadParentTasks();
    } catch (error) {
      console.error('Delete parent task error:', error);
      Alert.alert(text.common.error, copy.completeTaskError);
    } finally {
      setLoading(false);
    }
  };

  const renderPointPicker = (values: number[], selected: number, onSelect: (value: number) => void) => (
    <View style={styles.pointsGrid}>
      {values.map((value) => (
        <TouchableOpacity key={value} style={[styles.pointChip, { backgroundColor: palette.surface, borderColor: palette.border }, selected === value && { borderColor: palette.primary, backgroundColor: palette.primaryContainer }]} onPress={() => onSelect(value)}>
          <Text style={[styles.pointText, { color: selected === value ? palette.primary : palette.textSecondary }]}>{value > 0 ? `+${value}` : value}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTabContent = () => {
    if (activeTab === 'study') {
      return (
        <View style={styles.tabContent}>
          <Text style={[styles.label, { color: palette.textPrimary }]}>{text.add.subject}</Text>
          {scheduledSubjects.length === 0 ? (
            <Text style={[styles.label, { color: palette.textSecondary }]}>{copy.noScheduledSubjects}</Text>
          ) : (
            <View>
              <TouchableOpacity style={[styles.subjectSelect, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => setSubjectPickerOpen((value) => !value)}>
                <Text style={[styles.subjectSelectText, { color: palette.textPrimary }]} numberOfLines={1}>{getSubjectDisplayName(selectedSubject, lang) || copy.chooseSubject}</Text>
                <ChevronDown size={18} color={palette.textSecondary} />
              </TouchableOpacity>
              {subjectPickerOpen && (
                <View style={[styles.subjectDropdown, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  {scheduledSubjects.map((subject) => {
                    const active = subjectId === subject.id;
                    return (
                      <TouchableOpacity key={subject.id} style={styles.subjectOption} onPress={() => { setSubjectId(subject.id); setSubjectPickerOpen(false); }}>
                        <Text style={[styles.subjectText, { color: active ? Colors.study : palette.textPrimary }]}>{getSubjectDisplayName(subject, lang)}</Text>
                        {active && <Check size={16} color={Colors.study} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}
          <GradeSelector gradeSystem={cabinet?.gradeSystem ?? '5'} selectedGrade={grade} onSelect={setGrade} />
        </View>
      );
    }

    if (activeTab === 'sport') {
      return (
        <View style={styles.tabContent}>
          <Text style={[styles.label, { color: palette.textPrimary }]}>{text.add.sportType}</Text>
          <TouchableOpacity style={[styles.selectControl, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => setSportPickerOpen((value) => !value)}>
            <Text style={[styles.selectControlText, { color: palette.textPrimary }]} numberOfLines={1}>{selectedSportLabel}</Text>
            <ChevronDown size={18} color={palette.textSecondary} />
          </TouchableOpacity>
          {sportPickerOpen && (
            <View style={[styles.selectDropdown, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              {[...sportOptions, copy.custom].map((type, index) => {
                const value = index === sportOptions.length ? '__custom__' : type;
                const active = sportType === value || (!sportType && index === 0);
                return (
                  <TouchableOpacity key={value} style={styles.selectOption} onPress={() => { setSportType(value); setSportPickerOpen(false); }}>
                    <Text style={[styles.selectOptionText, { color: active ? Colors.sport : palette.textPrimary }]}>{type}</Text>
                    {active && <Check size={16} color={Colors.sport} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {sportType === '__custom__' && <Input value={customSportType} onChangeText={setCustomSportType} placeholder={copy.customSportPlaceholder} />}
          <Text style={[styles.label, { color: palette.textPrimary }]}>{text.common.points}</Text>
          {renderPointPicker([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], sportPoints, setSportPoints)}
        </View>
      );
    }

    if (activeTab === 'behavior') {
      return (
        <View style={styles.tabContent}>
          <Text style={[styles.label, { color: palette.textPrimary }]}>{text.add.behaviorType}</Text>
          <View style={styles.behaviorRow}>
            <TouchableOpacity style={[styles.behaviorBtn, { borderColor: palette.border }, behaviorType === 'good' && { borderColor: palette.success, backgroundColor: palette.successContainer }]} onPress={() => { setBehaviorType('good'); if (behaviorPoints < 1) setBehaviorPoints(5); }}>
              <Text style={[styles.behaviorText, { color: behaviorType === 'good' ? palette.textPrimary : palette.textSecondary }]}>{text.add.good}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.behaviorBtn, { borderColor: palette.border }, behaviorType === 'bad' && { borderColor: palette.danger, backgroundColor: palette.dangerContainer }]} onPress={() => { setBehaviorType('bad'); if (behaviorPoints > 0) setBehaviorPoints(-1); }}>
              <Text style={[styles.behaviorText, { color: behaviorType === 'bad' ? palette.textPrimary : palette.textSecondary }]}>{text.add.bad}</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.label, { color: palette.textPrimary }]}>{text.common.points}</Text>
          {renderPointPicker(behaviorType === 'good' ? GOOD_BEHAVIOR_POINTS : BAD_BEHAVIOR_POINTS, behaviorPoints, setBehaviorPoints)}
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <View style={styles.taskModeRow}>
          {[
            { key: 'active' as const, label: copy.active },
            { key: 'create' as const, label: copy.create },
          ].map((item) => {
            const active = taskMode === item.key;
            return (
              <TouchableOpacity key={item.key} style={[styles.taskModeButton, { borderColor: active ? palette.primary : palette.border, backgroundColor: active ? palette.primaryContainer : palette.surface }]} onPress={() => setTaskMode(item.key)}>
                <Text style={[styles.taskModeText, { color: active ? palette.primary : palette.textSecondary }]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {taskMode === 'active' ? (
          activeTasks.length === 0 ? (
            <Text style={[styles.label, { color: palette.textSecondary }]}>{copy.noActiveTasks}</Text>
          ) : (
            activeTasks.map((task) => (
              <View key={task.id} style={[styles.activeTaskCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={styles.activeTaskText}>
                  <Text style={[styles.activeTaskTitle, { color: palette.textPrimary }]}>{task.name}</Text>
                  <Text style={[styles.activeTaskMeta, { color: palette.textSecondary }]}>{copy.due}: {task.dueDate} · +{task.points} {text.common.points}</Text>
                </View>
                <TouchableOpacity style={[styles.taskIconButton, { borderColor: palette.border }]} onPress={() => handleDeleteParentTask(task)} disabled={loading}>
                  <Trash2 size={17} color={palette.danger} />
                </TouchableOpacity>
                <Button title={copy.done} onPress={() => handleCompleteParentTask(task)} size="small" loading={loading} />
              </View>
            ))
          )
        ) : (
          <>
            <Input label={text.add.taskName} value={taskName} onChangeText={setTaskName} placeholder={text.add.taskPlaceholder} />
            <Input label={text.add.taskPoints} value={taskPoints} onChangeText={(value) => setTaskPoints(value.replace(/[^\d]/g, '').slice(0, 3))} placeholder="5" keyboardType="numeric" />
            <DateInput label={copy.dueDate} value={taskDueDate} onChange={setTaskDueDate} />
          </>
        )}
      </View>
    );
  };

  // Добавление активностей — только для родителя (детский режим — просмотр).
  if (isChildMode) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Добавлять активности может только родитель.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!child || !cabinet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>{text.common.noChildCabinet}</Text>
          <Button title={text.add.addChild} onPress={() => router.push('/child-new')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      <Text style={[styles.title, { color: palette.textPrimary }]}>{text.add.title}</Text>
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity key={tab.key} style={[styles.tab, { backgroundColor: palette.surface, borderColor: palette.border }, isActive && { backgroundColor: tab.container, borderColor: tab.color }]} onPress={() => setActiveTab(tab.key)}>
              <Icon size={20} color={isActive ? tab.color : palette.textTertiary} />
              <Text style={[styles.tabLabel, { color: isActive ? tab.color : palette.textTertiary }, isActive && styles.tabLabelActive]} numberOfLines={1}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <DateInput label={text.add.date} value={activityDate} onChange={setActivityDate} editable={false} showStepButtons />
        {renderTabContent()}
        {(activeTab !== 'task' || taskMode === 'create') && (
          <View style={[styles.previewBanner, { backgroundColor: previewPoints < 0 ? palette.dangerContainer : previewPoints === 0 ? palette.surfaceVariant : palette.successContainer }]}>
            <Text style={[styles.previewBannerText, { color: previewPoints < 0 ? palette.danger : previewPoints === 0 ? palette.textSecondary : palette.success }]}>
              {tr(text.add.preview, { points: `${previewPoints > 0 ? '+' : ''}${formatPoints(previewPoints)}` })}
            </Text>
          </View>
        )}
        {activeTab !== 'task' && <Input label={text.add.note} value={note} onChangeText={setNote} placeholder={text.add.notePlaceholder} />}
        {(activeTab !== 'task' || taskMode === 'create') && <Button title={activeTab === 'task' ? copy.createTask : text.common.save} onPress={handleSubmit} loading={loading} size="large" />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 4, minWidth: 0 },
  tabLabel: { fontSize: 12, fontWeight: '500' },
  tabLabelActive: { fontWeight: '700' },
  scrollContent: { padding: 20, gap: 16, paddingBottom: 100 },
  tabContent: { gap: 16 },
  label: { fontSize: 16, fontWeight: '600' },
  subjectSelect: { minHeight: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  subjectSelectText: { flex: 1, fontSize: 15, fontWeight: '800' },
  subjectDropdown: { marginTop: 8, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  subjectOption: { minHeight: 42, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  subjectText: { fontSize: 14, fontWeight: '700' },
  selectControl: { minHeight: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectControlText: { flex: 1, fontSize: 15, fontWeight: '800' },
  selectDropdown: { marginTop: 8, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  selectOption: { minHeight: 42, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  selectOptionText: { fontSize: 14, fontWeight: '700' },
  behaviorRow: { flexDirection: 'row', gap: 12 },
  behaviorBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  behaviorText: { fontWeight: '800' },
  pointsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pointChip: { width: 48, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pointText: { fontWeight: '800' },
  taskModeRow: { flexDirection: 'row', gap: 8 },
  taskModeButton: { flex: 1, minHeight: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  taskModeText: { fontWeight: '800' },
  activeTaskCard: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  activeTaskText: { flex: 1, minWidth: 0 },
  activeTaskTitle: { fontSize: 15, fontWeight: '800' },
  activeTaskMeta: { marginTop: 3, fontSize: 12, fontWeight: '600' },
  taskIconButton: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  previewBanner: { borderRadius: 12, padding: 12, alignItems: 'center' },
  previewBannerText: { fontSize: 16, fontWeight: '800' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
  emptyText: { fontSize: 16, textAlign: 'center' },
});

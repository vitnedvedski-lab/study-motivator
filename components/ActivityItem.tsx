import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BookOpen, Dumbbell, Smile, CheckSquare, Pencil, Trash2 } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { Activity, ActivityType } from '../types';
import { StatsService } from '../services/statsService';
import { useAppText } from '../hooks/useAppText';
import { useAppTheme } from '../hooks/useAppTheme';
import { formatPoints } from '../utils/gradeScoring';
import { getLocalizedSubjectName } from '../utils/subjects';

interface ActivityItemProps {
  activity: Activity;
  showDate?: boolean;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activity: Activity) => void;
}

const TYPE_CONFIG: Record<ActivityType, { color: string; icon: any }> = {
  study: { color: Colors.study, icon: BookOpen },
  sport: { color: Colors.sport, icon: Dumbbell },
  behavior: { color: Colors.behavior, icon: Smile },
  task: { color: Colors.tasks, icon: CheckSquare },
};

export const ActivityItem = React.memo<ActivityItemProps>(({ activity, showDate = true, onEdit, onDelete }) => {
  const config = TYPE_CONFIG[activity.type];
  const Icon = config.icon;
  const isPositive = activity.points >= 0;
  const palette = useAppTheme();
  const { text, lang } = useAppText();

  const getDetail = () => {
    switch (activity.type) {
      case 'study':
        return `${getLocalizedSubjectName(activity.subjectName, lang) || text.activity.subject} - ${activity.gradeLabel ?? activity.grade}`;
      case 'sport':
        return activity.sportMinutes
          ? `${activity.sportType ?? text.activity.sportFallback} - ${activity.sportMinutes} ${text.activity.minutes}`
          : `${activity.sportType ?? text.activity.sportFallback} - ${formatPoints(activity.points)} ${text.common.points}`;
      case 'behavior':
        return activity.behaviorType === 'good' ? text.activity.goodBehavior : text.activity.badBehavior;
      case 'task':
        return activity.taskName ?? text.activity.task;
      default:
        return '';
    }
  };

  return (
    <View style={[styles.container, { borderBottomColor: palette.divider }]}>
      <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
        <Icon size={18} color={config.color} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.typeLabel, { color: palette.textSecondary }]}>{text.activity[activity.type]}</Text>
        <Text style={[styles.detail, { color: palette.textPrimary }]} numberOfLines={1}>
          {getDetail()}
        </Text>
        {showDate && (
          <Text style={[styles.date, { color: palette.textTertiary }]}>
            {StatsService.formatDate(activity.date)}
          </Text>
        )}
        {!!activity.note?.trim() && (
          <Text style={[styles.note, { color: palette.textTertiary }]} numberOfLines={2}>
            {activity.note.trim()}
          </Text>
        )}
      </View>
      <View style={styles.sideColumn}>
        <View style={styles.pointsContainer}>
          <Text style={[styles.points, { color: isPositive ? palette.success : palette.danger }]}>
            {isPositive ? '+' : ''}{formatPoints(activity.points)}
          </Text>
          <Text style={[styles.pointsLabel, { color: palette.textTertiary }]}>{text.common.points}</Text>
        </View>
        {(onEdit || onDelete) && (
          <View style={styles.actionRow}>
            {onEdit && (
              <TouchableOpacity style={[styles.actionButton, { borderColor: palette.border }]} onPress={() => onEdit(activity)}>
                <Pencil size={13} color={palette.primary} />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity style={[styles.actionButton, { borderColor: palette.border }]} onPress={() => onDelete(activity)}>
                <Trash2 size={13} color={palette.danger} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
});

ActivityItem.displayName = 'ActivityItem';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  detail: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  note: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  sideColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 5,
  },
  actionButton: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  points: {
    fontSize: 18,
    fontWeight: '800',
  },
  pointsLabel: {
    fontSize: 11,
  },
});

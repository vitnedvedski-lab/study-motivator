import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import { GradeSystem } from '../types';
import { getGradeOptions } from '../utils/gradeScoring';
import { useAppTheme } from '../hooks/useAppTheme';

interface GradeSelectorProps {
  gradeSystem: GradeSystem;
  selectedGrade: number;
  onSelect: (grade: number) => void;
}

export const GradeSelector = React.memo<GradeSelectorProps>(({ gradeSystem, selectedGrade, onSelect }) => {
  const grades = getGradeOptions(gradeSystem);
  const palette = useAppTheme();

  const getGradeColor = (grade: number): string => {
    if (gradeSystem === 'letter' || gradeSystem === 'percent') {
      if (grade >= 90) return Colors.success;
      if (grade >= 75) return Colors.study;
      if (grade >= 60) return Colors.warning;
      return Colors.danger;
    }
    if (gradeSystem === 'gpa') {
      if (grade >= 3.7) return Colors.success;
      if (grade >= 3) return Colors.study;
      if (grade >= 2) return Colors.warning;
      return Colors.danger;
    }
    if (gradeSystem === '5') {
      if (grade >= 5) return Colors.success;
      if (grade >= 4) return Colors.study;
      if (grade >= 3) return Colors.warning;
      return Colors.danger;
    }
    if (grade >= 9) return Colors.success;
    if (grade >= 7) return Colors.study;
    if (grade >= 5) return Colors.warning;
    return Colors.danger;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: palette.textPrimary }]}>Оценка</Text>
      <View style={styles.gradesRow}>
        {grades.map((grade) => {
          const isSelected = grade.value === selectedGrade;
          const color = getGradeColor(grade.value);
          return (
            <TouchableOpacity
              key={grade.label}
              style={[styles.gradeButton, { borderColor: color }, isSelected && { backgroundColor: color }]}
              onPress={() => onSelect(grade.value)}
              accessibilityLabel={`Оценка ${grade.label}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
            >
              <Text style={[styles.gradeText, { color: isSelected ? palette.textInverse : color }]}>
                {grade.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

GradeSelector.displayName = 'GradeSelector';

const styles = StyleSheet.create({
  container: { gap: 12 },
  label: { fontSize: 16, fontWeight: '600' },
  gradesRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  gradeButton: {
    minWidth: 48,
    height: 48,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: { fontSize: 18, fontWeight: '700' },
});

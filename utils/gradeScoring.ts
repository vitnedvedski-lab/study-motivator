import { CategoryWeights, GradeSystem, SubjectCategory } from '../types';

export type GradeOption = {
  value: number;
  label: string;
};

export const DEFAULT_CATEGORY_WEIGHTS: CategoryWeights = {
  A: 1.5,
  B: 1.2,
  C: 1,
};

const baseGradePoints: Record<GradeSystem, Array<{ min: number; points: number; label?: string }>> = {
  '5': [
    { min: 5, points: 5 },
    { min: 4, points: 3 },
    { min: 3, points: 1 },
    { min: 2, points: -2 },
    { min: 1, points: -4 },
  ],
  '10': [
    { min: 10, points: 5 },
    { min: 9, points: 4 },
    { min: 8, points: 3 },
    { min: 7, points: 2 },
    { min: 6, points: 1 },
    { min: 5, points: 0 },
    { min: 4, points: -1 },
    { min: 3, points: -2 },
    { min: 2, points: -3 },
    { min: 1, points: -4 },
  ],
  '12': [
    { min: 12, points: 5 },
    { min: 11, points: 4.5 },
    { min: 10, points: 4 },
    { min: 9, points: 3 },
    { min: 8, points: 2 },
    { min: 7, points: 1 },
    { min: 6, points: 0 },
    { min: 5, points: -1 },
    { min: 4, points: -2 },
    { min: 3, points: -3 },
    { min: 2, points: -4 },
    { min: 1, points: -5 },
  ],
  percent: [
    { min: 90, points: 5 },
    { min: 80, points: 4 },
    { min: 70, points: 3 },
    { min: 60, points: 1 },
    { min: 50, points: 0 },
    { min: 0, points: -3 },
  ],
  gpa: [
    { min: 4, points: 5, label: '4.0' },
    { min: 3.7, points: 4, label: '3.7' },
    { min: 3.3, points: 3, label: '3.3' },
    { min: 3, points: 2, label: '3.0' },
    { min: 2, points: 0, label: '2.0' },
    { min: 0, points: -3, label: '0.0' },
  ],
  letter: [
    { min: 97, points: 5, label: 'A+' },
    { min: 93, points: 5, label: 'A' },
    { min: 90, points: 4, label: 'A-' },
    { min: 87, points: 3, label: 'B+' },
    { min: 83, points: 2, label: 'B' },
    { min: 80, points: 1, label: 'B-' },
    { min: 77, points: 0, label: 'C+' },
    { min: 73, points: 0, label: 'C' },
    { min: 70, points: -1, label: 'C-' },
    { min: 65, points: -3, label: 'D' },
    { min: 0, points: -4, label: 'F' },
  ],
};

export const getGradeOptions = (gradeSystem: GradeSystem): GradeOption[] => {
  if (gradeSystem === 'letter') {
    return baseGradePoints.letter.map((grade) => ({
      value: grade.min,
      label: grade.label ?? String(grade.min),
    }));
  }

  if (gradeSystem === 'gpa') {
    return baseGradePoints.gpa.map((grade) => ({
      value: grade.min,
      label: grade.label ?? String(grade.min),
    }));
  }

  if (gradeSystem === 'percent') {
    return [100, 95, 90, 85, 80, 75, 70, 65, 60, 50, 40].map((value) => ({
      value,
      label: `${value}%`,
    }));
  }

  const max = gradeSystem === '12' ? 12 : gradeSystem === '10' ? 10 : 5;
  return Array.from({ length: max }, (_, index) => {
    const value = index + 1;
    return { value, label: String(value) };
  });
};

export const getGradeLabel = (gradeSystem: GradeSystem, value: number): string => {
  const option = getGradeOptions(gradeSystem).find((grade) => grade.value === value);
  return option?.label ?? String(value);
};

export const calculateStudyPoints = (
  grade: number,
  gradeSystem: GradeSystem,
  subjectCategory: SubjectCategory = 'C',
  categoryWeights: CategoryWeights = DEFAULT_CATEGORY_WEIGHTS
): number => {
  const table = baseGradePoints[gradeSystem] ?? baseGradePoints['5'];
  const base = table.find((entry) => grade >= entry.min)?.points ?? 0;
  const weight = categoryWeights[subjectCategory] ?? DEFAULT_CATEGORY_WEIGHTS[subjectCategory];
  return Math.round(base * weight * 2) / 2;
};

export const formatPoints = (points: number): string => {
  const rounded = Math.round(points * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

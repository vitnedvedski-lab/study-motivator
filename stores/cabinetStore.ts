/**
 * Zustand store для управления кабинетами (без persist для MVP)
 */
import { create } from 'zustand';
import { Cabinet, PeriodType, GradeSystem, Subject, ScheduleDay, CategoryWeights, ScoringPreset, ActivityTemplate } from '../types';
import { addPeriod, formatDateISO } from '../utils/datePeriod';

interface WizardState {
  step: number;
  name: string;
  startDate: string;
  endDate: string;
  periodType: PeriodType;
  subjects: Subject[];
  schedule: ScheduleDay[];
  gradeSystem: GradeSystem;
  sportEnabled: boolean;
  behaviorEnabled: boolean;
  maxPointsPerDay: number;
  maxPointsPerPeriod: number;
  minPointsForReward: number;
  scoringPreset: ScoringPreset;
  categoryWeights: CategoryWeights;
  activityTemplates: ActivityTemplate[];
  currencyEnabled: boolean;
  pointsToCurrency: number;
  currencySymbol: string;
  moneyPerPoint: number;
  currencyCode: string;
  screenPointsPerTenMinutes: number;
}

interface CabinetState {
  cabinets: Cabinet[];
  activeCabinetId: string | null;
  wizard: WizardState;
  isLoading: boolean;
  activeCabinet: () => Cabinet | null;
  setCabinets: (cabinets: Cabinet[]) => void;
  addCabinet: (cabinet: Cabinet) => void;
  updateCabinet: (id: string, updates: Partial<Cabinet>) => void;
  removeCabinet: (id: string) => void;
  setActiveCabinet: (id: string) => void;
  setWizardStep: (step: number) => void;
  updateWizard: (data: Partial<WizardState>) => void;
  setWizardFromCabinet: (cabinet: Cabinet) => void;
  resetWizard: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setLoading: (value: boolean) => void;
}

const defaultWizard: WizardState = {
  step: 1,
  name: '',
  startDate: formatDateISO(new Date()),
  endDate: addPeriod(formatDateISO(new Date()), 'month'),
  periodType: 'month',
  subjects: [],
  schedule: [],
  gradeSystem: '5',
  sportEnabled: true,
  behaviorEnabled: true,
  maxPointsPerDay: 100,
  maxPointsPerPeriod: 1000,
  minPointsForReward: 100,
  scoringPreset: 'unlimited',
  categoryWeights: { A: 1.5, B: 1.2, C: 1 },
  activityTemplates: [
    { id: 'sport_training', label: 'Тренировка', points: 5, type: 'sport' },
    { id: 'behavior_help', label: 'Помощь дома', points: 5, type: 'behavior' },
    { id: 'task_extra', label: 'Дополнительное задание', points: 5, type: 'task' },
  ],
  currencyEnabled: false,
  pointsToCurrency: 1,
  currencySymbol: '₽',
  moneyPerPoint: 1,
  currencyCode: 'RUB',
  screenPointsPerTenMinutes: 10,
};

const uniqueCabinets = (cabinets: Cabinet[]) => {
  const byId = new Map<string, Cabinet>();
  cabinets.forEach((cabinet) => {
    byId.set(cabinet.id, cabinet);
  });
  return Array.from(byId.values());
};

export const useCabinetStore = create<CabinetState>((set, get) => ({
  cabinets: [],
  activeCabinetId: null,
  wizard: { ...defaultWizard },
  isLoading: false,

  activeCabinet: () => {
    const { cabinets, activeCabinetId } = get();
    const active = cabinets.filter((cabinet) => cabinet.status !== 'archived' && !cabinet.archivedAt);
    return active.find((c) => c.id === activeCabinetId) ?? active[0] ?? null;
  },

  setCabinets: (cabinets) => set({ cabinets: uniqueCabinets(cabinets) }),

  addCabinet: (cabinet) =>
    set((state) => ({
      cabinets: uniqueCabinets([...state.cabinets, cabinet]),
      activeCabinetId: cabinet.id,
    })),

  updateCabinet: (id, updates) =>
    set((state) => ({
      cabinets: state.cabinets.map((cabinet) =>
        cabinet.id === id ? { ...cabinet, ...updates } : cabinet
      ),
    })),

  removeCabinet: (id) =>
    set((state) => {
      const cabinets = state.cabinets.filter((cabinet) => cabinet.id !== id);
      const nextActiveId =
        state.activeCabinetId === id
          ? cabinets.find((cabinet) => cabinet.status !== 'archived' && !cabinet.archivedAt)?.id ?? cabinets[0]?.id ?? null
          : state.activeCabinetId;

      return { cabinets, activeCabinetId: nextActiveId };
    }),

  setActiveCabinet: (id) => set({ activeCabinetId: id }),

  setWizardStep: (step) =>
    set((state) => ({ wizard: { ...state.wizard, step } })),

  updateWizard: (data) =>
    set((state) => {
      const next = { ...state.wizard, ...data };
      if (data.startDate || data.periodType) {
        next.endDate = addPeriod(next.startDate, next.periodType);
      }
      return { wizard: next };
    }),

  setWizardFromCabinet: (cabinet) =>
    set({
      wizard: {
        step: 1,
        name: `${cabinet.name} copy`,
        startDate: formatDateISO(new Date()),
        endDate: addPeriod(formatDateISO(new Date()), cabinet.periodType),
        periodType: cabinet.periodType,
        subjects: cabinet.subjects,
        schedule: cabinet.schedule,
        gradeSystem: cabinet.gradeSystem,
        sportEnabled: cabinet.sportEnabled,
        behaviorEnabled: cabinet.behaviorEnabled,
        maxPointsPerDay: cabinet.maxPointsPerDay,
        maxPointsPerPeriod: cabinet.maxPointsPerPeriod ?? cabinet.minPointsForReward ?? 100,
        minPointsForReward: cabinet.minPointsForReward ?? cabinet.maxPointsPerPeriod ?? 100,
        scoringPreset: cabinet.scoringPreset ?? 'unlimited',
        categoryWeights: cabinet.categoryWeights ?? defaultWizard.categoryWeights,
        activityTemplates: cabinet.activityTemplates ?? defaultWizard.activityTemplates,
        currencyEnabled: cabinet.currencyEnabled ?? false,
        pointsToCurrency: cabinet.pointsToCurrency,
        currencySymbol: cabinet.currencySymbol,
        moneyPerPoint: cabinet.moneyPerPoint ?? 1,
        currencyCode: cabinet.currencyCode ?? 'RUB',
        screenPointsPerTenMinutes: cabinet.screenPointsPerTenMinutes ?? 10,
      },
    }),

  resetWizard: () => set({ wizard: { ...defaultWizard } }),

  nextStep: () =>
    set((state) => ({
      wizard: { ...state.wizard, step: Math.min(state.wizard.step + 1, 6) },
    })),

  prevStep: () =>
    set((state) => ({
      wizard: { ...state.wizard, step: Math.max(state.wizard.step - 1, 1) },
    })),

  setLoading: (value) => set({ isLoading: value }),
}));

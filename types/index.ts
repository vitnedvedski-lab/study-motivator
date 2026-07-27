/**
 * Глобальные типы приложения "Мотиватор Учёбы"
 */

// ==================== AUTH ====================
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  createdAt: number;
}

export type AuthProvider = 'email' | 'google' | 'apple' | 'anonymous';

// ==================== CHILD ====================
export interface Child {
  id: string;
  name: string;
  avatarColor: string;
  avatarEmoji: string;
  birthDate?: string;
  grade?: number;
  gradeLetter?: string;
  school?: string;
  parentId: string;
  childDeviceUid?: string;
  linkCode?: string;
  linkCodeExpiresAt?: number;
  archivedAt?: number;
  totalPoints: number;
  availablePoints: number;
  savingsPoints: number;
  moneyPerPoint?: number;
  currencySymbol?: string;
  currencyCode?: string;
  screenPointsPerTenMinutes?: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  /** Маркеры начисленных бонусов за квесты: ключ `${questId}@${windowStart}` → timestamp */
  questBonuses?: Record<string, number>;
  createdAt: number;
  updatedAt: number;
}

// ==================== CABINET ====================
export type PeriodType = 'week' | 'month' | 'quarter' | 'semester' | 'year';
export type GradeSystem = '5' | '10' | '12' | 'letter' | 'percent' | 'gpa';
export type SubjectCategory = 'A' | 'B' | 'C';
export type CategoryWeights = Record<SubjectCategory, number>;

export interface Subject {
  id: string;
  name: string;
  nameRu: string;
  nameEn: string;
  nameZh: string;
  category: SubjectCategory;
  custom?: boolean;
}

export interface ScheduleDay {
  day: number; // 0-6 (вс-сб)
  subjects: string[]; // ID предметов
}

export type ScoringPreset = 'balanced' | 'growth' | 'unlimited';

export interface ActivityTemplate {
  id: string;
  label: string;
  points: number;
  type: 'sport' | 'behavior' | 'task';
}

export interface Cabinet {
  id: string;
  name: string;
  childId: string;
  parentId: string;
  startDate: string;
  endDate: string;
  periodType: PeriodType;
  subjects: Subject[];
  schedule: ScheduleDay[];
  gradeSystem: GradeSystem;
  sportEnabled: boolean;
  behaviorEnabled: boolean;
  maxPointsPerDay: number;
  maxPointsPerPeriod?: number;
  minPointsForReward?: number;
  scoringPreset?: ScoringPreset;
  categoryWeights?: CategoryWeights;
  activityTemplates?: ActivityTemplate[];
  currencyEnabled?: boolean;
  pointsToCurrency: number;
  currencySymbol: string;
  moneyPerPoint?: number;
  currencyCode?: string;
  screenPointsPerTenMinutes?: number;
  status?: 'active' | 'completed' | 'archived';
  completedAt?: number;
  archivedAt?: number;
  createdAt: number;
}

// ==================== ACTIVITY ====================
export type ActivityType = 'study' | 'sport' | 'behavior' | 'task';

export interface Activity {
  id: string;
  childId: string;
  cabinetId: string;
  type: ActivityType;
  subjectId?: string;
  subjectName?: string;
  grade?: number;
  gradeLabel?: string;
  subjectCategory?: SubjectCategory;
  sportType?: string;
  sportMinutes?: number;
  behaviorType?: 'good' | 'bad';
  behaviorNote?: string;
  taskName?: string;
  taskCompleted?: boolean;
  points: number;
  note: string;
  date: string;
  createdBy: string;
  createdAt: number;
}

export interface ParentTask {
  id: string;
  childId: string;
  cabinetId: string;
  name: string;
  points: number;
  dueDate: string;
  status: 'active' | 'completed';
  createdAt: number;
  completedAt?: number;
}

// ==================== REWARD ====================
export interface Reward {
  id: string;
  cabinetId: string;
  name: string;
  nameEn?: string;
  nameZh?: string;
  description: string;
  descriptionEn?: string;
  descriptionZh?: string;
  pointsCost: number;
  category: 'money' | 'screen' | 'other' | 'toy' | 'game' | 'activity' | 'privilege';
  icon: string;
  color: string;
  isRepeatable: boolean;
  purchaseLimit?: number;
  createdAt: number;
}

export type RewardCategory = Reward['category'];

export interface RewardPurchase {
  id: string;
  childId: string;
  cabinetId?: string;
  rewardId: string;
  rewardName: string;
  pointsSpent: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  purchasedAt: number;
  approvedAt?: number;
  completedAt?: number;
}

// ==================== ACHIEVEMENT ====================
export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  category: 'points' | 'streak' | 'study' | 'sport' | 'behavior' | 'shop';
  bonusPoints?: number;
}

export interface ChildAchievement {
  id: string;
  childId: string;
  achievementId: string;
  unlockedAt: number;
  progress: number;
}

// ==================== LEVEL ====================
export interface LevelConfig {
  level: number;
  name: string;
  minPoints: number;
  color: string;
}

// ==================== STATS ====================
export interface DailyStats {
  date: string;
  studyPoints: number;
  sportPoints: number;
  behaviorPoints: number;
  taskPoints: number;
  totalPoints: number;
}

export interface CategoryBreakdown {
  category: ActivityType;
  points: number;
  percentage: number;
}

// ==================== SETTINGS ====================
export interface AppSettings {
  language: 'ru' | 'en' | 'zh' | 'fr' | 'de' | 'it' | 'es';
  theme: 'light' | 'dark' | 'system';
  subscription: 'free' | 'premium';
  parentName?: string;
  pinEnabled: boolean;
  pinCode?: string;
  accessMode: 'parent' | 'child';
  biometricEnabled: boolean;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  agreementAcceptedAt?: number;
}

/**
 * Сервис для работы с кабинетами в Firestore
 */
import './firebase';
import firestore from '@react-native-firebase/firestore';
import { Cabinet, Child, Subject } from '../types';
import { DEFAULT_SUBJECTS } from '../constants/subjects';
import { formatDateDisplay } from '../utils/datePeriod';

const CABINETS_COLLECTION = 'cabinets';

export class CabinetService {
  /**
   * Создать кабинет
   */
  static async createCabinet(data: Omit<Cabinet, 'id' | 'createdAt'>): Promise<Cabinet> {
    const docRef = firestore().collection(CABINETS_COLLECTION).doc();
    const cabinet: Cabinet = {
      ...data,
      id: docRef.id,
      createdAt: Date.now(),
    };
    await docRef.set(cabinet);
    return cabinet;
  }

  static async createDefaultCabinet(child: Child, parentId: string): Promise<Cabinet> {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setFullYear(today.getFullYear() + 1);

    const subjects: Subject[] = DEFAULT_SUBJECTS.slice(0, 8).map((subject, index) => ({
      ...subject,
      id: `default_${index}_${subject.nameEn.toLowerCase().replace(/\s+/g, '_')}`,
      custom: false,
    }));

    return this.createCabinet({
      name: `Кабинет ${child.name}`,
      childId: child.id,
      parentId,
      startDate: formatDateDisplay(today),
      endDate: formatDateDisplay(endDate),
      periodType: 'month',
      subjects,
      schedule: [],
      gradeSystem: '5',
      sportEnabled: true,
      behaviorEnabled: true,
      maxPointsPerDay: 100,
      maxPointsPerPeriod: 100,
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
    });
  }

  /**
   * Получить кабинеты по ID ребёнка
   */
  static async getCabinetsByChild(childId: string, _parentId: string): Promise<Cabinet[]> {
    // Как и в подписке: фильтр только по childId (см. subscribeToCabinets).
    const snapshot = await firestore()
      .collection(CABINETS_COLLECTION)
      .where('childId', '==', childId)
      .get();

    return (snapshot?.docs ?? [])
      .map((doc) => doc.data() as Cabinet)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Получить кабинет по ID
   */
  static async getCabinetById(id: string): Promise<Cabinet | null> {
    const doc = await firestore().collection(CABINETS_COLLECTION).doc(id).get();
    return doc.exists ? (doc.data() as Cabinet) : null;
  }

  /**
   * Обновить кабинет
   */
  static async updateCabinet(id: string, updates: Partial<Cabinet>): Promise<void> {
    await firestore().collection(CABINETS_COLLECTION).doc(id).update(updates);
  }

  /**
   * Удалить кабинет
   */
  static async deleteCabinet(id: string): Promise<void> {
    await this.updateCabinet(id, {
      status: 'archived',
      archivedAt: Date.now(),
    });
  }

  static async hardDeleteCabinet(id: string): Promise<void> {
    await firestore().collection(CABINETS_COLLECTION).doc(id).delete();
  }

  /**
   * Подписка на кабинеты ребёнка
   */
  static subscribeToCabinets(
    childId: string,
    _parentId: string,
    callback: (cabinets: Cabinet[]) => void
  ) {
    // Фильтруем только по childId: childId глобально уникален, а фильтр по parentId
    // ломал подписку на привязанном устройстве ребёнка (там uid != parentId).
    return firestore()
      .collection(CABINETS_COLLECTION)
      .where('childId', '==', childId)
      .onSnapshot((snapshot) => {
        if (!snapshot) {
          callback([]);
          return;
        }
        const cabinets = (snapshot?.docs ?? [])
          .map((doc) => doc.data() as Cabinet)
          .sort((a, b) => b.createdAt - a.createdAt);
        callback(cabinets);
      }, (error) => {
        console.error('Cabinet subscription error:', error);
        callback([]);
      });
  }
}

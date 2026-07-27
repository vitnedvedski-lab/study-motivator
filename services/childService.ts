/**
 * Сервис для работы с детьми в Firestore
 */
import './firebase';
import firestore from '@react-native-firebase/firestore';
import { Child } from '../types';
import { getLevelByPoints } from '../constants/levels';

const CHILDREN_COLLECTION = 'children';
const LINK_TTL_MS = 1000 * 60 * 60 * 24;

const visibleChildren = (children: Child[]) =>
  children
    .filter((child) => !child.archivedAt)
    .sort((a, b) => a.createdAt - b.createdAt);

const createLinkCode = () =>
  Math.random().toString(36).slice(2, 5).toUpperCase() +
  '-' +
  Math.random().toString(36).slice(2, 5).toUpperCase();

export class ChildService {
  static async createChild(data: Omit<Child, 'id' | 'createdAt' | 'updatedAt'>): Promise<Child> {
    const now = Date.now();
    const docRef = firestore().collection(CHILDREN_COLLECTION).doc();
    const child: Child = {
      ...data,
      id: docRef.id,
      createdAt: now,
      updatedAt: now,
    };
    await docRef.set(child);
    return child;
  }

  static async getChildrenByParent(parentId: string): Promise<Child[]> {
    const snapshot = await firestore()
      .collection(CHILDREN_COLLECTION)
      .where('parentId', '==', parentId)
      .get();

    return visibleChildren((snapshot?.docs ?? []).map((doc) => doc.data() as Child));
  }

  static async getChildrenLinkedToDevice(uid: string): Promise<Child[]> {
    const snapshot = await firestore()
      .collection(CHILDREN_COLLECTION)
      .where('childDeviceUid', '==', uid)
      .get();

    return visibleChildren((snapshot?.docs ?? []).map((doc) => doc.data() as Child));
  }

  static async updateChild(id: string, updates: Partial<Child>): Promise<void> {
    await firestore()
      .collection(CHILDREN_COLLECTION)
      .doc(id)
      .update({
        ...updates,
        updatedAt: Date.now(),
      });
  }

  static async applyPointsDelta(
    id: string,
    pointsDelta: number
  ): Promise<Pick<Child, 'totalPoints' | 'availablePoints' | 'currentLevel' | 'updatedAt'>> {
    const docRef = firestore().collection(CHILDREN_COLLECTION).doc(id);

    return firestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);
      const child = snapshot.data() as Child | undefined;

      if (!child) {
        throw new Error('Child not found.');
      }

      // Баллы активностей (и плюс, и минус) меняют только totalPoints — это
      // прогресс текущего периода и уровни. availablePoints (заработок прошлых
      // периодов) здесь не трогаем: он пополняется только при закрытии периода
      // (через копилку), бонусами и не уменьшается текущими штрафами.
      const totalPoints = Math.max(0, (child.totalPoints ?? 0) + pointsDelta);
      const availablePoints = Math.max(0, child.availablePoints ?? 0);
      const currentLevel = getLevelByPoints(totalPoints);
      const updatedAt = Date.now();

      transaction.update(docRef, {
        totalPoints,
        availablePoints,
        currentLevel,
        updatedAt,
      });

      return {
        totalPoints,
        availablePoints,
        currentLevel,
        updatedAt,
      };
    });
  }

  static async archiveChild(id: string): Promise<void> {
    await this.updateChild(id, { archivedAt: Date.now() });
  }

  static async deleteChild(id: string): Promise<void> {
    await this.archiveChild(id);
  }

  static async generateLinkCode(childId: string): Promise<string> {
    const code = createLinkCode();
    await this.updateChild(childId, {
      linkCode: code,
      linkCodeExpiresAt: Date.now() + LINK_TTL_MS,
    });
    return code;
  }

  static async linkChildByCode(code: string, childDeviceUid: string): Promise<Child> {
    const normalizedCode = code.trim().toUpperCase();
    const snapshot = await firestore()
      .collection(CHILDREN_COLLECTION)
      .where('linkCode', '==', normalizedCode)
      .limit(1)
      .get();

    const doc = snapshot?.docs?.[0];
    if (!doc) {
      throw new Error('Код привязки не найден.');
    }

    const child = doc.data() as Child;
    if (child.linkCodeExpiresAt && child.linkCodeExpiresAt < Date.now()) {
      throw new Error('Код привязки истёк. Создайте новый код у родителя.');
    }

    await doc.ref.update({
      childDeviceUid,
      linkCode: firestore.FieldValue.delete(),
      linkCodeExpiresAt: firestore.FieldValue.delete(),
      updatedAt: Date.now(),
    });

    return {
      ...child,
      childDeviceUid,
      linkCode: undefined,
      linkCodeExpiresAt: undefined,
      updatedAt: Date.now(),
    };
  }

  static subscribeToChildren(parentId: string, callback: (children: Child[]) => void) {
    return firestore()
      .collection(CHILDREN_COLLECTION)
      .where('parentId', '==', parentId)
      .onSnapshot((snapshot) => {
        callback(visibleChildren((snapshot?.docs ?? []).map((doc) => doc.data() as Child)));
      }, (error) => {
        console.error('Children subscription error:', error);
        callback([]);
      });
  }

  static subscribeToLinkedChildren(uid: string, callback: (children: Child[]) => void) {
    return firestore()
      .collection(CHILDREN_COLLECTION)
      .where('childDeviceUid', '==', uid)
      .onSnapshot((snapshot) => {
        callback(visibleChildren((snapshot?.docs ?? []).map((doc) => doc.data() as Child)));
      }, (error) => {
        console.error('Linked children subscription error:', error);
        callback([]);
      });
  }
}

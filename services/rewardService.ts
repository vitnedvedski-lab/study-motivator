import './firebase';
import firestore from '@react-native-firebase/firestore';
import { Reward, RewardPurchase } from '../types';

const REWARDS_COLLECTION = 'rewards';
const PURCHASES_COLLECTION = 'rewardPurchases';

interface DefaultRewardOptions {
  moneyPerPoint?: number;
  currencySymbol?: string;
  screenPointsPerTenMinutes?: number;
}

export class RewardService {
  static async createDefaultRewards(
    cabinetId: string,
    periodTargetPoints?: number,
    options: DefaultRewardOptions = {}
  ): Promise<Reward[]> {
    const scale = periodTargetPoints && periodTargetPoints > 0 ? periodTargetPoints / 1000 : 1;
    const price = (base: number) => Math.max(5, Math.round((base * scale) / 5) * 5);
    const moneyPerPoint = Math.max(options.moneyPerPoint ?? 1, 0.01);
    const currencySymbol = options.currencySymbol ?? '₽';
    const screenPointsPerTenMinutes = Math.max(options.screenPointsPerTenMinutes ?? 10, 1);

    const moneyReward = (points: number) => `${Math.round(points * moneyPerPoint * 100) / 100} ${currencySymbol}`;
    const screenMinutes = (points: number) => Math.floor(points / screenPointsPerTenMinutes) * 10;
    const screenReward = (points: number) => `${screenMinutes(points)} мин экрана`;
    const screenRewardEn = (points: number) => `${screenMinutes(points)} min screen time`;
    const screenRewardZh = (points: number) => `${screenMinutes(points)}分钟屏幕时间`;
    const target = Math.max(periodTargetPoints ?? 100, 20);
    const presetCosts = [0.05, 0.1, 0.2, 0.5, 1].map((part) => Math.max(1, Math.round(target * part)));
    const smallMoneyCost = presetCosts[0];
    const bigMoneyCost = presetCosts[4];
    const shortScreenCost = presetCosts[0];
    const longScreenCost = presetCosts[4];
    const extraMoneyCosts = presetCosts.slice(1, 4);
    const extraScreenCosts = presetCosts.slice(1, 4);

    const defaults: Omit<Reward, 'id' | 'createdAt'>[] = [
      {
        cabinetId,
        name: moneyReward(smallMoneyCost),
        nameEn: moneyReward(smallMoneyCost),
        nameZh: moneyReward(smallMoneyCost),
        description: 'Денежная награда по курсу кабинета',
        descriptionEn: 'Money reward based on the cabinet rate',
        descriptionZh: '按档案汇率兑换的金钱奖励',
        pointsCost: smallMoneyCost,
        category: 'money',
        icon: '💰',
        color: '#48A16B',
        isRepeatable: true,
      },
      ...extraMoneyCosts.map((points) => ({
        cabinetId,
        name: moneyReward(points),
        nameEn: moneyReward(points),
        nameZh: moneyReward(points),
        description: 'Money reward based on the cabinet rate',
        descriptionEn: 'Money reward based on the cabinet rate',
        descriptionZh: 'Money reward based on the cabinet rate',
        pointsCost: points,
        category: 'money' as const,
        icon: '💰',
        color: '#48A16B',
        isRepeatable: true,
      })),
      ...extraScreenCosts.map((points) => ({
        cabinetId,
        name: screenReward(points),
        nameEn: screenRewardEn(points),
        nameZh: screenRewardZh(points),
        description: 'Screen time based on the cabinet rate',
        descriptionEn: 'Screen time based on the cabinet rate',
        descriptionZh: 'Screen time based on the cabinet rate',
        pointsCost: points,
        category: 'screen' as const,
        icon: '📱',
        color: '#4A6FA5',
        isRepeatable: true,
      })),
      {
        cabinetId,
        name: moneyReward(bigMoneyCost),
        nameEn: moneyReward(bigMoneyCost),
        nameZh: moneyReward(bigMoneyCost),
        description: 'Крупная денежная награда по курсу кабинета',
        descriptionEn: 'Larger money reward based on the cabinet rate',
        descriptionZh: '按档案汇率兑换的较大金钱奖励',
        pointsCost: bigMoneyCost,
        category: 'money',
        icon: '💰',
        color: '#48A16B',
        isRepeatable: true,
      },
      {
        cabinetId,
        name: screenReward(shortScreenCost),
        nameEn: screenRewardEn(shortScreenCost),
        nameZh: screenRewardZh(shortScreenCost),
        description: 'Экранное время по курсу кабинета',
        descriptionEn: 'Screen time based on the cabinet rate',
        descriptionZh: '按档案汇率兑换的屏幕时间',
        pointsCost: shortScreenCost,
        category: 'screen',
        icon: '📱',
        color: '#4A6FA5',
        isRepeatable: true,
      },
      {
        cabinetId,
        name: screenReward(longScreenCost),
        nameEn: screenRewardEn(longScreenCost),
        nameZh: screenRewardZh(longScreenCost),
        description: 'Большая порция экранного времени',
        descriptionEn: 'A larger block of screen time',
        descriptionZh: '更多屏幕时间',
        pointsCost: longScreenCost,
        category: 'screen',
        icon: '📱',
        color: '#4A6FA5',
        isRepeatable: true,
      },
      {
        cabinetId,
        name: 'Поздний отбой',
        nameEn: 'Late bedtime',
        nameZh: '晚睡一次',
        description: 'Один вечер можно лечь позже',
        descriptionEn: 'One evening with a later bedtime',
        descriptionZh: '有一个晚上可以晚点睡',
        pointsCost: price(80),
        category: 'privilege',
        icon: '🌙',
        color: '#7B6DB5',
        isRepeatable: true,
      },
      {
        cabinetId,
        name: 'Выбор ужина',
        nameEn: 'Dinner choice',
        nameZh: '选择晚餐',
        description: 'Ребёнок выбирает семейный ужин',
        descriptionEn: 'The child chooses the family dinner',
        descriptionZh: '孩子选择家庭晚餐',
        pointsCost: price(60),
        category: 'activity',
        icon: '🍽️',
        color: '#D4883A',
        isRepeatable: true,
      },
      {
        cabinetId,
        name: 'Игровой вечер',
        nameEn: 'Game night',
        nameZh: '游戏之夜',
        description: 'Вечер настольных или видеоигр вместе',
        descriptionEn: 'Board games or video games together',
        descriptionZh: '一起玩桌游或电子游戏',
        pointsCost: price(120),
        category: 'game',
        icon: '🎮',
        color: '#E8A010',
        isRepeatable: true,
      },
      {
        cabinetId,
        name: 'Поход в кино',
        nameEn: 'Movie night',
        nameZh: '电影之夜',
        description: 'Семейный поход в кино или домашний кинотеатр',
        descriptionEn: 'A family cinema trip or home movie night',
        descriptionZh: '家庭影院或去电影院',
        pointsCost: price(200),
        category: 'activity',
        icon: '🎬',
        color: '#D44040',
        isRepeatable: true,
      },
    ];

    return Promise.all(defaults.map((reward) => this.createReward(reward)));
  }

  static async createReward(data: Omit<Reward, 'id' | 'createdAt'>): Promise<Reward> {
    const docRef = firestore().collection(REWARDS_COLLECTION).doc();
    const reward: Reward = { ...data, id: docRef.id, createdAt: Date.now() };
    await docRef.set(reward);
    return reward;
  }

  static async getRewardsByCabinet(cabinetId: string): Promise<Reward[]> {
    const snapshot = await firestore().collection(REWARDS_COLLECTION).where('cabinetId', '==', cabinetId).get();
    return (snapshot?.docs ?? []).map((doc) => doc.data() as Reward).sort((a, b) => a.pointsCost - b.pointsCost);
  }

  static async updateReward(id: string, updates: Partial<Reward>): Promise<void> {
    await firestore().collection(REWARDS_COLLECTION).doc(id).update(updates);
  }

  static async deleteReward(id: string): Promise<void> {
    await firestore().collection(REWARDS_COLLECTION).doc(id).delete();
  }

  /**
   * Купить награду: создание покупки и списание баллов — одной транзакцией,
   * чтобы не было рассинхронизации при гонках/падении приложения.
   */
  static async purchaseReward(childId: string, reward: Reward): Promise<RewardPurchase> {
    const purchaseRef = firestore().collection(PURCHASES_COLLECTION).doc();
    const childRef = firestore().collection('children').doc(childId);

    const purchase: RewardPurchase = {
      id: purchaseRef.id,
      childId,
      cabinetId: reward.cabinetId,
      rewardId: reward.id,
      rewardName: reward.name,
      pointsSpent: reward.pointsCost,
      status: 'pending',
      purchasedAt: Date.now(),
    };

    await firestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(childRef);
      const child = snapshot.data();
      if (!child) {
        throw new Error('Ребёнок не найден');
      }
      const available = child.availablePoints ?? 0;
      if (available < reward.pointsCost) {
        throw new Error('Недостаточно баллов');
      }
      transaction.update(childRef, {
        availablePoints: Math.max(0, available - reward.pointsCost),
        updatedAt: Date.now(),
      });
      transaction.set(purchaseRef, purchase);
    });

    return purchase;
  }

  /**
   * Отклонить покупку: статус 'rejected' + возврат баллов ребёнку (транзакция).
   */
  static async rejectPurchase(purchaseId: string): Promise<void> {
    const purchaseRef = firestore().collection(PURCHASES_COLLECTION).doc(purchaseId);

    await firestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(purchaseRef);
      const purchase = snapshot.data() as RewardPurchase | undefined;
      if (!purchase || purchase.status !== 'pending') {
        throw new Error('Покупка уже обработана');
      }
      const childRef = firestore().collection('children').doc(purchase.childId);
      const childSnapshot = await transaction.get(childRef);
      const child = childSnapshot.data();

      transaction.update(purchaseRef, { status: 'rejected' });
      if (child) {
        transaction.update(childRef, {
          availablePoints: (child.availablePoints ?? 0) + purchase.pointsSpent,
          updatedAt: Date.now(),
        });
      }
    });
  }

  static async getPurchasesByChild(childId: string): Promise<RewardPurchase[]> {
    const snapshot = await firestore().collection(PURCHASES_COLLECTION).where('childId', '==', childId).get();
    return (snapshot?.docs ?? []).map((doc) => doc.data() as RewardPurchase).sort((a, b) => b.purchasedAt - a.purchasedAt);
  }

  static subscribeToPurchases(childId: string, callback: (purchases: RewardPurchase[]) => void) {
    return firestore()
      .collection(PURCHASES_COLLECTION)
      .where('childId', '==', childId)
      .onSnapshot(
        (snapshot) => {
          const purchases = (snapshot?.docs ?? [])
            .map((doc) => doc.data() as RewardPurchase)
            .sort((a, b) => b.purchasedAt - a.purchasedAt);
          callback(purchases);
        },
        (error) => {
          console.error('Purchases subscription error:', error);
          callback([]);
        }
      );
  }

  static async approvePurchase(purchaseId: string): Promise<void> {
    await firestore().collection(PURCHASES_COLLECTION).doc(purchaseId).update({ status: 'approved', approvedAt: Date.now() });
  }

  static async completePurchase(purchaseId: string): Promise<void> {
    await firestore().collection(PURCHASES_COLLECTION).doc(purchaseId).update({ status: 'completed', completedAt: Date.now() });
  }

  static subscribeToRewards(cabinetId: string, callback: (rewards: Reward[]) => void) {
    return firestore()
      .collection(REWARDS_COLLECTION)
      .where('cabinetId', '==', cabinetId)
      .onSnapshot(
        (snapshot) => {
          const rewards = (snapshot?.docs ?? [])
            .map((doc) => doc.data() as Reward)
            .sort((a, b) => a.pointsCost - b.pointsCost);
          callback(rewards);
        },
        (error) => {
          console.error('Rewards subscription error:', error);
          callback([]);
        }
      );
  }
}

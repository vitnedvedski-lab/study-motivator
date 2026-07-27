import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Coins, Gift, PiggyBank, Plus, ShoppingBag, Smartphone, Star } from 'lucide-react-native';
import { RewardCard } from '../../components/RewardCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Confetti } from '../../components/ui/Confetti';
import { Input } from '../../components/ui/Input';
import { PointsBadge } from '../../components/ui/PointsBadge';
import { ChildService } from '../../services/childService';
import { RewardService } from '../../services/rewardService';
import { useCabinetStore } from '../../stores/cabinetStore';
import { useChildStore } from '../../stores/childStore';
import { useUIStore } from '../../stores/uiStore';
import { Reward, RewardCategory } from '../../types';
import { useAppText } from '../../hooks/useAppText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { getRewardDisplayName } from '../../utils/rewards';

const CATEGORIES: { key: RewardCategory | 'all'; labelKey: 'all' | 'money' | 'screen' | 'other'; icon: any }[] = [
  { key: 'all', labelKey: 'all', icon: ShoppingBag },
  { key: 'money', labelKey: 'money', icon: Coins },
  { key: 'screen', labelKey: 'screen', icon: Smartphone },
  { key: 'other', labelKey: 'other', icon: Star },
];

export default function ShopScreen() {
  const router = useRouter();
  const { selectedChild, updateChild } = useChildStore();
  const { activeCabinet } = useCabinetStore();
  const { settings } = useUIStore();
  const { text, tr, lang } = useAppText();
  const palette = useAppTheme();
  const child = selectedChild();
  const cabinet = activeCabinet();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [activeCategory, setActiveCategory] = useState<RewardCategory | 'all'>('all');
  const [savingsAmount, setSavingsAmount] = useState('10');
  const [moneyPerPointDraft, setMoneyPerPointDraft] = useState('1');
  const [screenPointsDraft, setScreenPointsDraft] = useState('10');
  const [currencySymbolDraft, setCurrencySymbolDraft] = useState('₽');
  const [showConfetti, setShowConfetti] = useState(false);
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [presetRepairing, setPresetRepairing] = useState(false);
  const isChildMode = settings.accessMode === 'child';

  useEffect(() => {
    if (!cabinet) return;
    return RewardService.subscribeToRewards(cabinet.id, setRewards);
  }, [cabinet?.id]);

  useEffect(() => {
    if (!child && !cabinet) return;
    setMoneyPerPointDraft(String(child?.moneyPerPoint ?? cabinet?.moneyPerPoint ?? 1));
    setScreenPointsDraft(String(child?.screenPointsPerTenMinutes ?? cabinet?.screenPointsPerTenMinutes ?? 10));
    setCurrencySymbolDraft(child?.currencySymbol ?? cabinet?.currencySymbol ?? '₽');
  }, [child?.id, child?.moneyPerPoint, child?.currencySymbol, child?.screenPointsPerTenMinutes, cabinet?.id]);

  const conversion = {
    moneyPerPoint: child?.moneyPerPoint ?? cabinet?.moneyPerPoint ?? 1,
    currencySymbol: child?.currencySymbol ?? cabinet?.currencySymbol ?? '₽',
    screenPointsPerTenMinutes: child?.screenPointsPerTenMinutes ?? cabinet?.screenPointsPerTenMinutes ?? 10,
  };

  useEffect(() => {
    if (!cabinet || presetRepairing || rewards.length === 0) return;
    const moneyCount = rewards.filter((reward) => reward.category === 'money').length;
    const screenCount = rewards.filter((reward) => reward.category === 'screen').length;
    if (moneyCount >= 5 && screenCount >= 5) return;
    setPresetRepairing(true);
    RewardService.createDefaultRewards(cabinet.id, cabinet.minPointsForReward ?? cabinet.maxPointsPerPeriod, {
      moneyPerPoint: conversion.moneyPerPoint,
      currencySymbol: conversion.currencySymbol,
      screenPointsPerTenMinutes: conversion.screenPointsPerTenMinutes,
    }).finally(() => setPresetRepairing(false));
  }, [cabinet, conversion.currencySymbol, conversion.screenPointsPerTenMinutes, presetRepairing, rewards]);

  const filteredRewards = activeCategory === 'all'
    ? rewards
    : activeCategory === 'other'
      ? rewards.filter((reward) => !['money', 'screen'].includes(reward.category))
    : rewards.filter((reward) => reward.category === activeCategory);

  const switchCategoryBySwipe = (direction: -1 | 1) => {
    const currentIndex = CATEGORIES.findIndex((category) => category.key === activeCategory);
    const nextIndex = Math.min(CATEGORIES.length - 1, Math.max(0, currentIndex + direction));
    setActiveCategory(CATEGORIES[nextIndex].key);
  };

  const handleBuy = (reward: Reward) => {
    if (!child) return;
    Alert.alert(text.shop.confirmTitle, tr(text.shop.confirmText, { name: getRewardDisplayName(reward, lang), points: reward.pointsCost }), [
      { text: text.common.cancel, style: 'cancel' },
      {
        text: text.common.buy,
        onPress: async () => {
          try {
            // Покупка и списание баллов выполняются одной транзакцией в сервисе.
            await RewardService.purchaseReward(child.id, reward);
            setShowConfetti(true);
          } catch (err: any) {
            Alert.alert(text.common.error, err.message ?? text.shop.notEnough);
          }
        },
      },
    ]);
  };

  const handleSavings = async (deposit: boolean) => {
    if (!child) return;
    const amount = parseInt(savingsAmount, 10) || 0;
    if (amount <= 0) return;
    if (deposit && amount > child.availablePoints) {
      Alert.alert(text.common.error, text.shop.notEnough);
      return;
    }
    if (!deposit && amount > child.savingsPoints) {
      Alert.alert(text.common.error, text.shop.notEnough);
      return;
    }

    const updates = deposit
      ? { availablePoints: child.availablePoints - amount, savingsPoints: child.savingsPoints + amount }
      : { availablePoints: child.availablePoints + amount, savingsPoints: child.savingsPoints - amount };
    await ChildService.updateChild(child.id, updates);
    updateChild(child.id, updates);
  };

  const handleSaveConversion = async () => {
    if (!child) return;
    const moneyPerPoint = Math.min(10000000000, Math.max(0, Number(moneyPerPointDraft.replace(',', '.')) || 0));
    const screenPointsPerTenMinutes = Math.max(1, Number(screenPointsDraft.replace(',', '.')) || 1);
    const currencySymbol = currencySymbolDraft.trim().slice(0, 4) || '₽';
    const updates = { moneyPerPoint, screenPointsPerTenMinutes, currencySymbol };
    await ChildService.updateChild(child.id, updates);
    updateChild(child.id, updates);

    await Promise.all(rewards.map((reward) => {
      if (reward.category === 'money') {
        const value = Math.round(reward.pointsCost * moneyPerPoint * 100) / 100;
        return RewardService.updateReward(reward.id, {
          name: `${value} ${currencySymbol}`,
          nameEn: `${value} ${currencySymbol}`,
          description: 'Денежная награда по курсу ребёнка',
          descriptionEn: 'Money reward based on the child rate',
        });
      }
      if (reward.category === 'screen') {
        const minutes = Math.floor(reward.pointsCost / screenPointsPerTenMinutes) * 10;
        return RewardService.updateReward(reward.id, {
          name: `${minutes} мин экрана`,
          nameEn: `${minutes} min screen time`,
          description: 'Экранное время по курсу ребёнка',
          descriptionEn: 'Screen time based on the child rate',
        });
      }
      return Promise.resolve();
    }));
    Alert.alert(text.common.save, 'Курс наград сохранён.');
  };

  const handleEditReward = (reward: Reward) => {
    Alert.alert('Изменить стоимость', `${getRewardDisplayName(reward, lang)}\n${reward.pointsCost} ${text.common.points}`, [
      { text: '-50', onPress: () => RewardService.updateReward(reward.id, { pointsCost: Math.max(1, reward.pointsCost - 50) }) },
      { text: '-10', onPress: () => RewardService.updateReward(reward.id, { pointsCost: Math.max(1, reward.pointsCost - 10) }) },
      { text: '+10', onPress: () => RewardService.updateReward(reward.id, { pointsCost: reward.pointsCost + 10 }) },
      { text: '+50', onPress: () => RewardService.updateReward(reward.id, { pointsCost: reward.pointsCost + 50 }) },
      { text: text.common.cancel, style: 'cancel' },
    ]);
  };

  const handleDeleteReward = (reward: Reward) => {
    Alert.alert('Удалить награду?', getRewardDisplayName(reward, lang), [
      { text: text.common.cancel, style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => RewardService.deleteReward(reward.id) },
    ]);
  };

  if (!child || !cabinet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>{text.common.noChildCabinet}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      onTouchStart={(event) => setSwipeStartX(event.nativeEvent.pageX)}
      onTouchEnd={(event) => {
        if (swipeStartX === null) return;
        const delta = event.nativeEvent.pageX - swipeStartX;
        if (Math.abs(delta) > 70) switchCategoryBySwipe(delta < 0 ? 1 : -1);
        setSwipeStartX(null);
      }}
    >
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

      <View style={styles.header}>
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>{text.shop.title}</Text>
          <TouchableOpacity style={styles.myRewardsLink} onPress={() => router.push('/my-rewards')}>
            <Gift size={16} color={palette.primary} />
            <Text style={[styles.myRewardsText, { color: palette.primary }]}>{isChildMode ? text.shop.myRewards : text.shop.childPurchases}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerActions}>
          {settings.accessMode === 'parent' && (
            <TouchableOpacity style={[styles.addRewardButton, { backgroundColor: palette.primary }]} onPress={() => router.push('/reward-new')}>
              <Plus size={20} color={palette.textInverse} />
            </TouchableOpacity>
          )}
          <PointsBadge points={child.availablePoints} size="medium" />
        </View>
      </View>

      {isChildMode && (
        <Card style={styles.savingsCard} padding="medium">
          <View style={styles.savingsRow}>
            <PiggyBank size={24} color={palette.success} />
            <Text style={[styles.savingsLabel, { color: palette.textPrimary }]}>{text.shop.savings}</Text>
            <Text style={[styles.savingsValue, { color: palette.success }]}>{child.savingsPoints} {text.common.points}</Text>
          </View>
          <Text style={[styles.savingsHint, { color: palette.textSecondary }]}>{text.shop.savingsHint}</Text>
          <Input value={savingsAmount} onChangeText={setSavingsAmount} keyboardType="numeric" placeholder="10" style={styles.savingsInput} />
          <View style={styles.savingsActions}>
            <TouchableOpacity style={[styles.savingsBtn, { backgroundColor: palette.successContainer }]} onPress={() => handleSavings(true)}>
              <Text style={[styles.savingsBtnText, { color: palette.success }]}>{text.shop.deposit}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.savingsBtn, { backgroundColor: palette.dangerContainer }]} onPress={() => handleSavings(false)}>
              <Text style={[styles.savingsBtnText, { color: palette.danger }]}>{text.shop.withdraw}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {!isChildMode && (activeCategory === 'all' || activeCategory === 'money' || activeCategory === 'screen') && (
        <Card style={styles.conversionCard} padding="small">
          <Text style={[styles.conversionTitle, { color: palette.textPrimary }]}>Курс наград ребёнка</Text>
          <View style={styles.conversionRow}>
            {(activeCategory === 'all' || activeCategory === 'money') && (
              <>
                <Input
                  label="1 балл"
                  value={moneyPerPointDraft}
                  onChangeText={(value) => setMoneyPerPointDraft(value.replace(/[^\d.,]/g, '').replace(',', '.'))}
                  keyboardType="numeric"
                  style={styles.conversionInput}
                />
                <Input
                  label="Валюта"
                  value={currencySymbolDraft}
                  onChangeText={(value) => setCurrencySymbolDraft(value.slice(0, 4))}
                  style={styles.currencyInput}
                />
              </>
            )}
            {(activeCategory === 'all' || activeCategory === 'screen') && (
              <Input
                label="Баллов за 10 мин"
                value={screenPointsDraft}
                onChangeText={(value) => setScreenPointsDraft(value.replace(/[^\d.,]/g, '').replace(',', '.'))}
                keyboardType="numeric"
                style={styles.conversionInput}
              />
            )}
          </View>
          <Button title="Сохранить курс" onPress={handleSaveConversion} size="small" />
        </Card>
      )}

      <View style={styles.categoriesBand}>
        <View style={styles.categoriesContainer}>
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            const active = activeCategory === category.key;
            return (
              <TouchableOpacity
                key={category.key}
                style={[
                  styles.categoryChip,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                  active && { borderColor: palette.primary, backgroundColor: palette.primaryContainer },
                ]}
                onPress={() => setActiveCategory(category.key)}
              >
                <Icon size={18} color={active ? palette.primary : palette.textSecondary} />
                <Text style={[styles.categoryText, { color: active ? palette.primary : palette.textSecondary }, active && styles.categoryTextActive]} numberOfLines={1}>
                  {text.shop.categories[category.labelKey]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.rewardsList} showsVerticalScrollIndicator={false}>
        {filteredRewards.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ShoppingBag size={48} color={palette.textTertiary} />
            <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>{text.shop.emptyTitle}</Text>
            <Text style={[styles.emptySubtitle, { color: palette.textSecondary }]}>{text.shop.emptySubtitle}</Text>
          </Card>
        ) : (
          filteredRewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              canAfford={child.availablePoints >= reward.pointsCost}
              onBuy={handleBuy}
              showBuy={isChildMode}
              disabledReason={isChildMode ? undefined : text.shop.childOnly}
              onEdit={!isChildMode ? handleEditReward : undefined}
              onDelete={!isChildMode ? handleDeleteReward : undefined}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 12 },
  headerTitleBlock: { flex: 1, minWidth: 0 },
  title: { fontSize: 22, fontWeight: '800' },
  myRewardsLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  myRewardsText: { fontWeight: '700', fontSize: 13 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addRewardButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  periodHint: { marginHorizontal: 20, marginBottom: 10 },
  periodHintText: { fontSize: 12, fontWeight: '700' },
  savingsCard: { marginHorizontal: 20, marginBottom: 12 },
  savingsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  savingsLabel: { flex: 1, fontSize: 16, fontWeight: '700' },
  savingsValue: { fontSize: 18, fontWeight: '800' },
  savingsHint: { fontSize: 12, marginTop: 8 },
  savingsInput: { marginTop: 12 },
  savingsActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  savingsBtn: { flex: 1, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  savingsBtnText: { fontWeight: '800' },
  conversionCard: { marginHorizontal: 20, marginBottom: 10, gap: 10 },
  conversionTitle: { fontSize: 13, fontWeight: '900' },
  conversionRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' },
  conversionInput: { flex: 1, minWidth: 120 },
  currencyInput: { width: 84 },
  categoriesBand: { paddingHorizontal: 16, paddingVertical: 8 },
  categoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { flex: 1, flexBasis: '22%', minWidth: 70, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 10, borderWidth: 1, paddingHorizontal: 6 },
  categoryText: { fontWeight: '700', fontSize: 11, flexShrink: 1 },
  categoryTextActive: { fontWeight: '800' },
  rewardsList: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  emptyCard: { alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySubtitle: { textAlign: 'center' },
});

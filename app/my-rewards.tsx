import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft, Gift, Timer } from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAppText } from '../hooks/useAppText';
import { useCabinetStore } from '../stores/cabinetStore';
import { useChildStore } from '../stores/childStore';
import { useUIStore } from '../stores/uiStore';
import { RewardService } from '../services/rewardService';
import { RewardPurchase } from '../types';
import { formatDateDisplay } from '../utils/datePeriod';

const COPY = {
  ru: {
    parentTitle: 'Покупки ребёнка',
    childTitle: 'Мои награды',
    emptyTitle: 'Покупок пока нет',
    emptyText: 'Купленные награды появятся здесь после завершения периода.',
    points: 'баллов',
    approveTitle: 'Выдать награду',
    approveText: 'Отметить "{{name}}" как выданную ребёнку?',
    completeTitle: 'Использовать награду',
    completeText: 'Отметить "{{name}}" как использованную?',
    cancel: 'Отмена',
    approve: 'Выдать',
    finish: 'Завершить',
    use: 'Использовать',
    used: 'Использована',
    reject: 'Отклонить',
    rejectTitle: 'Отклонить покупку',
    rejectText: 'Отклонить "{{name}}" и вернуть {{points}} баллов ребёнку?',
    statuses: { pending: 'Куплена', approved: 'Выдана', rejected: 'Отклонена', completed: 'Использована' },
  },
  en: {
    parentTitle: 'Child purchases',
    childTitle: 'My rewards',
    emptyTitle: 'No purchases yet',
    emptyText: 'Purchased rewards will appear here after the period ends.',
    points: 'points',
    approveTitle: 'Give reward',
    approveText: 'Mark "{{name}}" as given to the child?',
    completeTitle: 'Use reward',
    completeText: 'Mark "{{name}}" as used?',
    cancel: 'Cancel',
    approve: 'Give',
    finish: 'Finish',
    use: 'Use',
    used: 'Used',
    reject: 'Reject',
    rejectTitle: 'Reject purchase',
    rejectText: 'Reject "{{name}}" and refund {{points}} points to the child?',
    statuses: { pending: 'Purchased', approved: 'Given', rejected: 'Rejected', completed: 'Used' },
  },
  zh: {
    parentTitle: '孩子的购买',
    childTitle: '我的奖励',
    emptyTitle: '暂无购买',
    emptyText: '周期结束后购买的奖励会显示在这里。',
    points: '积分',
    approveTitle: '发放奖励',
    approveText: '将“{{name}}”标记为已发放给孩子？',
    completeTitle: '使用奖励',
    completeText: '将“{{name}}”标记为已使用？',
    cancel: '取消',
    approve: '发放',
    finish: '完成',
    use: '使用',
    used: '已使用',
    reject: '拒绝',
    rejectTitle: '拒绝购买',
    rejectText: '拒绝“{{name}}”并退还 {{points}} 积分给孩子？',
    statuses: { pending: '已购买', approved: '已发放', rejected: '已拒绝', completed: '已使用' },
  },
};

const formatDate = (timestamp: number) => formatDateDisplay(new Date(timestamp));

const isFreshCompleted = (purchase: RewardPurchase) => {
  if (purchase.status !== 'completed') return true;
  const completedAt = purchase.completedAt ?? purchase.purchasedAt;
  return Date.now() - completedAt < 1000 * 60 * 60 * 24 * 14;
};

export default function MyRewardsScreen() {
  const router = useRouter();
  const palette = useAppTheme();
  const { lang, tr } = useAppText();
  const copy = COPY[lang as keyof typeof COPY] ?? COPY.en;
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const child = useChildStore((state) => state.selectedChild());
  const cabinet = useCabinetStore((state) => state.activeCabinet());
  const accessMode = useUIStore((state) => state.settings.accessMode);
  const isParentMode = accessMode === 'parent';
  const [purchases, setPurchases] = useState<RewardPurchase[]>([]);

  useEffect(() => {
    if (!child) return;
    return RewardService.subscribeToPurchases(child.id, setPurchases);
  }, [child?.id]);

  const visiblePurchases = purchases.filter((purchase) => {
    const sameCabinet = !cabinet || !purchase.cabinetId || purchase.cabinetId === cabinet.id;
    return sameCabinet && isFreshCompleted(purchase);
  });

  const approvePurchase = (purchase: RewardPurchase) => {
    Alert.alert(copy.approveTitle, tr(copy.approveText, { name: purchase.rewardName }), [
      { text: copy.cancel, style: 'cancel' },
      { text: copy.approve, onPress: () => RewardService.approvePurchase(purchase.id) },
    ]);
  };

  const rejectPurchase = (purchase: RewardPurchase) => {
    Alert.alert(copy.rejectTitle, tr(copy.rejectText, { name: purchase.rewardName, points: purchase.pointsSpent }), [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.reject,
        style: 'destructive',
        onPress: async () => {
          try {
            await RewardService.rejectPurchase(purchase.id);
          } catch (error) {
            console.error('Reject purchase error:', error);
          }
        },
      },
    ]);
  };

  const completePurchase = (purchase: RewardPurchase) => {
    Alert.alert(copy.completeTitle, tr(copy.completeText, { name: purchase.rewardName }), [
      { text: copy.cancel, style: 'cancel' },
      { text: copy.used, onPress: () => RewardService.completePurchase(purchase.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button title="" onPress={() => router.back()} variant="ghost" icon={<ChevronLeft size={24} color={palette.textPrimary} />} />
        <Text style={styles.headerTitle}>{isParentMode ? copy.parentTitle : copy.childTitle}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {visiblePurchases.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Gift size={48} color={palette.textTertiary} />
            <Text style={styles.emptyTitle}>{copy.emptyTitle}</Text>
            <Text style={styles.emptyText}>{copy.emptyText}</Text>
          </Card>
        ) : (
          visiblePurchases.map((purchase) => {
            const completed = purchase.status === 'completed';
            const approved = purchase.status === 'approved';
            return (
              <Card key={purchase.id} style={styles.rewardCard}>
                <View style={styles.rewardHeader}>
                  <View style={styles.iconBox}>
                    {completed ? <CheckCircle2 size={24} color={palette.success} /> : <Gift size={24} color={palette.primary} />}
                  </View>
                  <View style={styles.rewardInfo}>
                    <Text style={styles.rewardTitle}>{purchase.rewardName}</Text>
                    <Text style={styles.rewardMeta}>{purchase.pointsSpent} {copy.points} · {formatDate(purchase.purchasedAt)}</Text>
                  </View>
                </View>

                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge, completed && styles.statusDone]}>
                    <Timer size={14} color={completed ? palette.success : palette.primary} />
                    <Text style={[styles.statusText, completed && styles.statusDoneText]}>{copy.statuses[purchase.status]}</Text>
                  </View>

                  {isParentMode && purchase.status === 'pending' && (
                    <View style={styles.actionGroup}>
                      <TouchableOpacity style={styles.actionButton} onPress={() => approvePurchase(purchase)}>
                        <Text style={styles.actionButtonText}>{copy.approve}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => rejectPurchase(purchase)}>
                        <Text style={styles.actionButtonText}>{copy.reject}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {isParentMode && approved && (
                    <TouchableOpacity style={styles.actionButton} onPress={() => completePurchase(purchase)}>
                      <Text style={styles.actionButtonText}>{copy.finish}</Text>
                    </TouchableOpacity>
                  )}

                  {!isParentMode && approved && (
                    <TouchableOpacity style={styles.actionButton} onPress={() => completePurchase(purchase)}>
                      <Text style={styles.actionButtonText}>{copy.use}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (palette: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: palette.textPrimary },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  emptyCard: { alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: palette.textPrimary },
  emptyText: { color: palette.textSecondary, textAlign: 'center' },
  rewardCard: { padding: 16, gap: 14 },
  rewardHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primaryContainer },
  rewardInfo: { flex: 1, minWidth: 0 },
  rewardTitle: { fontSize: 16, fontWeight: '800', color: palette.textPrimary },
  rewardMeta: { marginTop: 4, fontSize: 13, color: palette.textSecondary },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: palette.primaryContainer },
  statusDone: { backgroundColor: palette.successContainer },
  statusText: { color: palette.primary, fontSize: 12, fontWeight: '800' },
  statusDoneText: { color: palette.success },
  actionGroup: { flexDirection: 'row', gap: 8 },
  actionButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: palette.primary },
  rejectButton: { backgroundColor: palette.danger },
  actionButtonText: { color: palette.textInverse, fontWeight: '800', fontSize: 13 },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gift, ShoppingBag, Gamepad2, Bike, Crown, Star, Coins, Smartphone, Pencil, Trash2 } from 'lucide-react-native';
import { Reward } from '../types';
import { Button } from './ui/Button';
import { PointsBadge } from './ui/PointsBadge';
import { useAppText } from '../hooks/useAppText';
import { useAppTheme } from '../hooks/useAppTheme';
import { getRewardDisplayDescription, getRewardDisplayName } from '../utils/rewards';

interface RewardCardProps {
  reward: Reward;
  canAfford: boolean;
  onBuy: (reward: Reward) => void;
  showBuy?: boolean;
  disabledReason?: string;
  onEdit?: (reward: Reward) => void;
  onDelete?: (reward: Reward) => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  toy: Gift,
  game: Gamepad2,
  activity: Bike,
  privilege: Crown,
  money: Coins,
  screen: Smartphone,
  other: Star,
};

export const RewardCard = React.memo<RewardCardProps>(({ reward, canAfford, onBuy, showBuy = true, disabledReason, onEdit, onDelete }) => {
  const Icon = CATEGORY_ICONS[reward.category] ?? ShoppingBag;
  const palette = useAppTheme();
  const { text, lang } = useAppText();
  const rewardName = getRewardDisplayName(reward, lang);
  const rewardDescription = getRewardDisplayDescription(reward, lang);

  return (
    <View style={[styles.container, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: reward.color + '20' }]}>
        {reward.icon ? (
          <Text style={styles.rewardEmoji}>{reward.icon}</Text>
        ) : (
          <Icon size={32} color={reward.color} />
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: palette.textPrimary }]} numberOfLines={1}>{rewardName}</Text>
          {(onEdit || onDelete) && (
            <View style={styles.actionRow}>
              {onEdit && (
                <Button title="" onPress={() => onEdit(reward)} variant="ghost" size="small" icon={<Pencil size={14} color={palette.primary} />} />
              )}
              {onDelete && (
                <Button title="" onPress={() => onDelete(reward)} variant="ghost" size="small" icon={<Trash2 size={14} color={palette.danger} />} />
              )}
            </View>
          )}
        </View>
        <Text style={[styles.description, { color: palette.textSecondary }]} numberOfLines={2}>
          {rewardDescription}
        </Text>
        <View style={styles.footer}>
          <PointsBadge points={reward.pointsCost} size="small" />
          {showBuy ? (
            <Button
              title={text.common.buy}
              onPress={() => onBuy(reward)}
              variant={canAfford ? 'primary' : 'outline'}
              size="small"
              disabled={!canAfford}
              accessibilityLabel={`${text.common.buy} ${rewardName}`}
            />
          ) : disabledReason ? (
            <Text style={[styles.lockedText, { color: palette.textSecondary }]}>{disabledReason}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
});

RewardCard.displayName = 'RewardCard';

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardEmoji: {
    fontSize: 30,
  },
  content: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  lockedText: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
  },
});

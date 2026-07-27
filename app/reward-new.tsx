import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Gift } from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAppText } from '../hooks/useAppText';
import { useCabinetStore } from '../stores/cabinetStore';
import { RewardService } from '../services/rewardService';
import { RewardCategory } from '../types';

const COPY = {
  ru: {
    title: 'Новая награда',
    reward: 'Награда',
    enterName: 'Введите название награды.',
    invalidCost: 'Стоимость должна быть положительным числом.',
    createError: 'Не удалось создать награду.',
    defaultDescription: 'Кастомная награда',
    previewName: 'Название награды',
    points: 'баллов',
    name: 'Название',
    namePlaceholder: 'Например: новая книга',
    description: 'Описание',
    descriptionPlaceholder: 'Что включает награда',
    cost: 'Стоимость в баллах',
    category: 'Категория',
    icon: 'Иконка',
    create: 'Создать награду',
    categories: { money: 'Деньги', screen: 'Экран', other: 'Другое' },
  },
  en: {
    title: 'New reward',
    reward: 'Reward',
    enterName: 'Enter a reward name.',
    invalidCost: 'Cost must be a positive number.',
    createError: 'Could not create the reward.',
    defaultDescription: 'Custom reward',
    previewName: 'Reward name',
    points: 'points',
    name: 'Name',
    namePlaceholder: 'Example: a new book',
    description: 'Description',
    descriptionPlaceholder: 'What the reward includes',
    cost: 'Cost in points',
    category: 'Category',
    icon: 'Icon',
    create: 'Create reward',
    categories: { money: 'Money', screen: 'Screen', other: 'Other' },
  },
  zh: {
    title: '新奖励',
    reward: '奖励',
    enterName: '请输入奖励名称。',
    invalidCost: '价格必须是正数。',
    createError: '无法创建奖励。',
    defaultDescription: '自定义奖励',
    previewName: '奖励名称',
    points: '积分',
    name: '名称',
    namePlaceholder: '例如：一本新书',
    description: '描述',
    descriptionPlaceholder: '奖励包含什么',
    cost: '积分价格',
    category: '分类',
    icon: '图标',
    create: '创建奖励',
    categories: { money: '金钱', screen: '屏幕', other: '其他' },
  },
};

const CATEGORY_BASE: { key: RewardCategory; color: string; icon: string }[] = [
  { key: 'money', color: '#48A16B', icon: '💰' },
  { key: 'screen', color: '#4A6FA5', icon: '📱' },
  { key: 'other', color: '#D4883A', icon: '🎁' },
];

const EMOJIS = ['🎁', '🎮', '🍔', '📚', '🎬', '🎨', '⚽', '🎧', '🧩', '💰', '📱', '🌙'];

export default function RewardNewScreen() {
  const router = useRouter();
  const palette = useAppTheme();
  const { lang, text } = useAppText();
  const copy = COPY[lang as keyof typeof COPY] ?? COPY.en;
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const cabinet = useCabinetStore((state) => state.activeCabinet());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pointsCost, setPointsCost] = useState('50');
  const [category, setCategory] = useState<RewardCategory>('other');
  const [icon, setIcon] = useState('🎁');
  const [loading, setLoading] = useState(false);

  const categories = CATEGORY_BASE.map((item) => ({ ...item, label: copy.categories[item.key as keyof typeof copy.categories] ?? copy.categories.other }));
  const selectedCategory = categories.find((item) => item.key === category) ?? categories[2];

  const handleCreate = async () => {
    if (!cabinet) return;
    if (!name.trim()) {
      Alert.alert(copy.reward, copy.enterName);
      return;
    }

    const cost = parseInt(pointsCost, 10);
    if (!Number.isFinite(cost) || cost <= 0) {
      Alert.alert(copy.reward, copy.invalidCost);
      return;
    }

    setLoading(true);
    try {
      await RewardService.createReward({
        cabinetId: cabinet.id,
        name: name.trim(),
        description: description.trim() || copy.defaultDescription,
        pointsCost: cost,
        category,
        icon,
        color: selectedCategory.color,
        isRepeatable: true,
      });
      router.back();
    } catch (err: any) {
      Alert.alert(text.common.error, err.message ?? copy.createError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button title="" onPress={() => router.back()} variant="ghost" icon={<ChevronLeft size={24} color={palette.textPrimary} />} />
        <Text style={styles.headerTitle}>{copy.title}</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.previewCard} variant="elevated">
          <View style={[styles.previewIcon, { backgroundColor: `${selectedCategory.color}20` }]}>
            <Text style={styles.previewEmoji}>{icon}</Text>
          </View>
          <Text style={styles.previewTitle}>{name.trim() || copy.previewName}</Text>
          <Text style={styles.previewSubtitle}>{pointsCost || 0} {copy.points}</Text>
        </Card>

        <Input label={copy.name} value={name} onChangeText={setName} placeholder={copy.namePlaceholder} />
        <Input label={copy.description} value={description} onChangeText={setDescription} placeholder={copy.descriptionPlaceholder} />
        <Input label={copy.cost} value={pointsCost} onChangeText={(value) => setPointsCost(value.replace(/[^\d]/g, '').slice(0, 5))} keyboardType="numeric" />

        <Text style={styles.sectionTitle}>{copy.category}</Text>
        <View style={styles.categoryRow}>
          {categories.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.categoryChip, category === item.key && styles.categoryChipActive]}
              onPress={() => {
                setCategory(item.key);
                setIcon(item.icon);
              }}
            >
              <Text style={styles.categoryEmoji}>{item.icon}</Text>
              <Text style={[styles.categoryText, category === item.key && styles.categoryTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{copy.icon}</Text>
        <View style={styles.emojiGrid}>
          {EMOJIS.map((emoji) => (
            <TouchableOpacity key={emoji} style={[styles.emojiButton, icon === emoji && styles.emojiButtonActive]} onPress={() => setIcon(emoji)}>
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button title={copy.create} onPress={handleCreate} loading={loading} size="large" icon={<Gift size={18} color={palette.textInverse} />} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (palette: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: palette.textPrimary },
  content: { padding: 24, gap: 16, paddingBottom: 40 },
  previewCard: { alignItems: 'center', padding: 20, gap: 8 },
  previewIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  previewEmoji: { fontSize: 34 },
  previewTitle: { fontSize: 18, fontWeight: '800', color: palette.textPrimary, textAlign: 'center' },
  previewSubtitle: { color: palette.primary, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: palette.textPrimary },
  categoryRow: { flexDirection: 'row', gap: 10 },
  categoryChip: { flex: 1, minHeight: 64, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center', gap: 4 },
  categoryChipActive: { borderColor: palette.primary, backgroundColor: palette.primaryContainer },
  categoryEmoji: { fontSize: 22 },
  categoryText: { color: palette.textSecondary, fontWeight: '700', fontSize: 13 },
  categoryTextActive: { color: palette.primary },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emojiButton: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' },
  emojiButtonActive: { borderColor: palette.primary, backgroundColor: palette.primaryContainer },
  emojiText: { fontSize: 24 },
});

/**
 * Редактирование профиля ребёнка
 */
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { DateInput } from '../components/DateInput';
import { Input } from '../components/ui/Input';
import { useAppTheme } from '../hooks/useAppTheme';
import { useChildStore } from '../stores/childStore';
import { ChildService } from '../services/childService';

const AVATAR_COLORS = [
  '#E8A010', '#48A16B', '#4A6FA5', '#D44040', '#7B6DB5',
  '#D4883A', '#E85D75', '#2D9CDB', '#9B59B6', '#1ABC9C',
  '#F2C94C', '#56CCF2',
];

const AVATAR_EMOJIS = [
  '⭐', '🚀', '🎨', '🎸', '⚽',
  '🏆', '📚', '🧠', '🎮', '🎯',
  '🌟', '💡', '🎲', '🎧', '🛹',
];

export default function ChildEditScreen() {
  const router = useRouter();
  const palette = useAppTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const params = useLocalSearchParams<{ id?: string }>();
  const { children, selectedChild, updateChild, removeChild } = useChildStore();
  const currentChild = useMemo(
    () => children.find((child) => child.id === params.id) ?? selectedChild(),
    [children, params.id, selectedChild]
  );

  const [name, setName] = useState(currentChild?.name ?? '');
  const [birthDate, setBirthDate] = useState(currentChild?.birthDate ?? '');
  const [grade, setGrade] = useState(currentChild?.grade ? String(currentChild.grade) : '');
  const [school, setSchool] = useState(currentChild?.school ?? '');
  const [avatarColor, setAvatarColor] = useState(currentChild?.avatarColor ?? AVATAR_COLORS[0]);
  const [avatarEmoji, setAvatarEmoji] = useState(currentChild?.avatarEmoji ?? AVATAR_EMOJIS[0]);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!currentChild || !name.trim()) return;
    setLoading(true);
    try {
      const updates = {
        name: name.trim(),
        birthDate: birthDate.trim() || undefined,
        grade: grade.trim() ? parseInt(grade, 10) : undefined,
        school: school.trim() || undefined,
        avatarColor,
        avatarEmoji,
      };
      await ChildService.updateChild(currentChild.id, updates);
      updateChild(currentChild.id, updates);
      router.back();
    } catch (err: any) {
      Alert.alert('Ошибка', err.message ?? 'Не удалось сохранить профиль.');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = () => {
    if (!currentChild) return;
    Alert.alert(
      'Удалить ребёнка',
      'Профиль будет скрыт и сохранён в архиве. История баллов, покупок и достижений не удаляется.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await ChildService.archiveChild(currentChild.id);
              removeChild(currentChild.id);
              router.replace('/(tabs)');
            } catch (err: any) {
              Alert.alert('Ошибка', err.message ?? 'Не удалось удалить ребёнка.');
            }
          },
        },
      ]
    );
  };

  if (!currentChild) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Ребёнок не найден</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button
          title=""
          onPress={() => router.back()}
          variant="ghost"
          icon={<ChevronLeft size={24} color={Colors.textPrimary} />}
        />
        <Text style={styles.headerTitle}>Профиль ребёнка</Text>
        <TouchableOpacity style={styles.deleteIcon} onPress={handleArchive}>
          <Trash2 size={20} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarPreview}>
          <Avatar emoji={avatarEmoji} color={avatarColor} name={name} size="xlarge" />
        </View>

        <Input label="Имя" value={name} onChangeText={setName} placeholder="Имя ребёнка" />
        <DateInput label="Дата рождения" value={birthDate} onChange={setBirthDate} placeholder="ДД-ММ-ГГГГ" />
        <Input label="Класс" value={grade} onChangeText={setGrade} keyboardType="numeric" placeholder="Например: 5" />
        <Input label="Школа" value={school} onChangeText={setSchool} placeholder="Например: школа №12" />

        <Text style={styles.sectionLabel}>Цвет профиля</Text>
        <View style={styles.colorGrid}>
          {AVATAR_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorDot,
                { backgroundColor: color },
                avatarColor === color && styles.colorDotSelected,
              ]}
              onPress={() => setAvatarColor(color)}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>Эмодзи</Text>
        <View style={styles.emojiGrid}>
          {AVATAR_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[styles.emojiButton, avatarEmoji === emoji && styles.emojiButtonSelected]}
              onPress={() => setAvatarEmoji(emoji)}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button title="Сохранить" onPress={handleSave} loading={loading} disabled={!name.trim()} size="large" />
        <Button title="Удалить ребёнка" onPress={handleArchive} variant="danger" icon={<Trash2 size={18} color={Colors.textInverse} />} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  deleteIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    gap: 18,
    paddingBottom: 40,
  },
  avatarPreview: {
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: Colors.textPrimary,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  emojiText: {
    fontSize: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
});

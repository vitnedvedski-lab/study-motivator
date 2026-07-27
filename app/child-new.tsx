import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DateInput } from '../components/DateInput';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuthStore } from '../stores/authStore';
import { useChildStore } from '../stores/childStore';
import { useUIStore } from '../stores/uiStore';
import { ChildService } from '../services/childService';
import { Child } from '../types';

const AVATAR_COLORS = [
  '#E8A010', '#48A16B', '#4A6FA5', '#D44040', '#7B6DB5',
  '#D4883A', '#E85D75', '#2D9CDB', '#9B59B6', '#1ABC9C',
  '#F2C94C', '#56CCF2',
];

const AVATAR_EMOJIS = ['⭐', '🚀', '🎨', '🎸', '⚽', '📚', '🏆', '💡', '🌈', '🎯'];

export default function AddChildScreen() {
  const router = useRouter();
  const Colors = useAppTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { user } = useAuthStore();
  const { addChild, children } = useChildStore();
  const { settings } = useUIStore();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [grade, setGrade] = useState('');
  const [gradeLetter, setGradeLetter] = useState('');
  const [school, setSchool] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [selectedEmoji, setSelectedEmoji] = useState(AVATAR_EMOJIS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (settings.subscription === 'free' && children.length >= 1) {
      setError('В бесплатном плане доступен 1 ребёнок. Для нескольких детей нужен Premium.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const parentId = user?.uid;
      if (!parentId) throw new Error('Сначала войдите в аккаунт.');

      const childData: Omit<Child, 'id' | 'createdAt' | 'updatedAt'> = {
        name: name.trim(),
        avatarColor: selectedColor,
        avatarEmoji: selectedEmoji,
        birthDate: birthDate.trim() || undefined,
        grade: grade.trim() ? parseInt(grade, 10) : undefined,
        gradeLetter: gradeLetter.trim().toUpperCase() || undefined,
        school: school.trim() || undefined,
        parentId,
        totalPoints: 0,
        availablePoints: 0,
        savingsPoints: 0,
        currentLevel: 1,
        currentStreak: 0,
        longestStreak: 0,
      };

      const child = await ChildService.createChild(childData);
      addChild(child);
      router.replace({ pathname: '/cabinet-new', params: { fresh: '1' } });
    } catch (err: any) {
      setError(err.message ?? 'Не удалось создать ребёнка.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button
          title=""
          onPress={() => router.back()}
          variant="ghost"
          icon={<ChevronLeft size={24} color={Colors.textPrimary} />}
          accessibilityLabel="Назад"
        />
        <Text style={styles.headerTitle}>Добавить ребёнка</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarPreview}>
          <Avatar emoji={selectedEmoji} color={selectedColor} name={name} size="xlarge" />
        </View>

        <Input
          label="Имя ребёнка"
          value={name}
          onChangeText={setName}
          placeholder="Введите имя"
          accessibilityLabel="Имя ребёнка"
        />

        <DateInput
          label="Дата рождения"
          value={birthDate}
          onChange={setBirthDate}
          placeholder="ДД-ММ-ГГГГ"
        />

        <View style={styles.gradeRow}>
          <Input
            label="Класс"
            value={grade}
            onChangeText={(value) => setGrade(value.replace(/\D/g, '').slice(0, 2))}
            placeholder="5"
            keyboardType="numeric"
            accessibilityLabel="Класс"
            style={styles.gradeNumberInput}
          />
          <Input
            label="Буква"
            value={gradeLetter}
            onChangeText={(value) => setGradeLetter(value.replace(/[^a-zA-Zа-яА-Я]/g, '').slice(0, 1))}
            placeholder="А"
            autoCapitalize="characters"
            accessibilityLabel="Буква класса"
            style={styles.gradeLetterInput}
          />
        </View>

        <Input
          label="Школа"
          value={school}
          onChangeText={setSchool}
          placeholder="Например: школа №12"
          accessibilityLabel="Школа"
        />

        <Text style={styles.sectionLabel}>Цвет аватара</Text>
        <View style={styles.colorGrid}>
          {AVATAR_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[styles.colorWrapper, selectedColor === color && styles.colorWrapperSelected]}
              onPress={() => setSelectedColor(color)}
              accessibilityRole="button"
            >
              <Avatar emoji={selectedEmoji} color={color} size="medium" />
              <Text style={[styles.colorCheck, { color }]}>
                {selectedColor === color ? '✓' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Иконка</Text>
        <View style={styles.emojiGrid}>
          {AVATAR_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[styles.emojiWrapper, selectedEmoji === emoji && styles.emojiWrapperSelected]}
              onPress={() => setSelectedEmoji(emoji)}
              accessibilityRole="button"
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title="Сохранить"
          onPress={handleSubmit}
          loading={loading}
          size="large"
          disabled={!name.trim()}
          accessibilityLabel="Сохранить ребёнка"
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
  scrollContent: {
    padding: 24,
    gap: 20,
  },
  avatarPreview: {
    alignItems: 'center',
    marginBottom: 8,
  },
  gradeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gradeNumberInput: {
    flex: 1,
  },
  gradeLetterInput: {
    width: 104,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorWrapper: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorWrapperSelected: {
    borderColor: Colors.primary,
  },
  colorCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 14,
    fontWeight: '800',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emojiWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  emojiWrapperSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  emojiText: {
    fontSize: 24,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
});

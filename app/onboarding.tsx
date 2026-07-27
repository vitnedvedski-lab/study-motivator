import React, { useMemo, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BookOpen, Check, ShoppingBag, Sparkles, Trophy } from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import { Colors } from '../constants/colors';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';

const { width: SCREEN_W } = Dimensions.get('window');

const PARENT_SLIDES = [
  {
    icon: BookOpen,
    title: 'Создайте кабинет ребёнка',
    description: 'Выберите период, предметы, категории и расписание. После этого оценки удобно ставить прямо из дневника.',
    color: Colors.study,
  },
  {
    icon: Trophy,
    title: 'Настройте порог и награды',
    description: 'Укажите минимум баллов за период, денежный курс и экранное время. Итоги подводятся после завершения периода.',
    color: Colors.primary,
  },
  {
    icon: ShoppingBag,
    title: 'Следите за магазином и статистикой',
    description: 'Ребёнок тратит доступные баллы на награды, а вы видите динамику, оценки и рекомендации по предметам.',
    color: Colors.success,
  },
  {
    icon: Sparkles,
    title: 'Приложение помогает, но не заменяет родителей',
    description: 'Рекомендации носят информационный характер. Решения о воспитании, обучении и наградах всегда остаются за родителями.',
    color: Colors.warning,
  },
];

const CHILD_SLIDES = [
  {
    icon: Trophy,
    title: 'Зарабатывай баллы',
    description: 'Оценки, задания, спорт и хорошее поведение помогают двигаться к новым уровням и достижениям.',
    color: Colors.primary,
  },
  {
    icon: ShoppingBag,
    title: 'Открывай награды',
    description: 'Когда период завершён и цель достигнута, баллы можно использовать в магазине наград.',
    color: Colors.success,
  },
  {
    icon: Sparkles,
    title: 'Смотри коллекцию',
    description: 'Карточки достижений становятся активными, когда ты выполняешь условия и набираешь прогресс.',
    color: Colors.warning,
  },
];

export default function OnboardingScreen() {
  const palette = useAppTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const { completeOnboarding } = useAuthStore();
  const { settings, updateSettings } = useUIStore();
  const router = useRouter();
  const slides = settings.accessMode === 'child' ? CHILD_SLIDES : PARENT_SLIDES;
  const slide = slides[currentIndex];
  const Icon = slide.icon;

  const finishOnboarding = () => {
    if (!settings.agreementAcceptedAt && !agreementAccepted) return;
    if (!settings.agreementAcceptedAt) {
      updateSettings({ agreementAcceptedAt: Date.now() });
    }
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    finishOnboarding();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.slide, { width: SCREEN_W }]}>
        <View style={[styles.iconContainer, { backgroundColor: `${slide.color}18` }]}>
          <Icon size={64} color={slide.color} strokeWidth={1.7} />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      <View style={styles.indicators}>
        {slides.map((item, index) => (
          <View
            key={item.title}
            style={[styles.indicator, index === currentIndex && styles.indicatorActive]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        {currentIndex < slides.length - 1 ? (
          <View style={styles.buttonRow}>
            <Button title="Пропустить" onPress={() => setCurrentIndex(slides.length - 1)} variant="ghost" size="medium" />
            <Button title="Далее" onPress={goToNext} size="medium" />
          </View>
        ) : (
          <View style={styles.finalBlock}>
            {!settings.agreementAcceptedAt && (
              <TouchableOpacity style={styles.agreementRow} onPress={() => setAgreementAccepted((value) => !value)}>
                <View style={[styles.checkbox, agreementAccepted && styles.checkboxActive]}>
                  {agreementAccepted && <Check size={16} color={Colors.textInverse} />}
                </View>
                <Text style={styles.agreementText}>
                  Я понимаю, что приложение является вспомогательным инструментом, а ответственность за решения, обучение, здоровье, безопасность и поощрения ребёнка несут родители или законные представители.
                </Text>
              </TouchableOpacity>
            )}
            <Button title="Начать" onPress={finishOnboarding} size="large" disabled={!settings.agreementAcceptedAt && !agreementAccepted} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  slide: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 36, gap: 22 },
  iconContainer: { width: 118, height: 118, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  description: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  indicators: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.divider },
  indicatorActive: { width: 24, backgroundColor: Colors.primary, borderRadius: 4 },
  footer: { padding: 24, paddingBottom: 40 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  finalBlock: { gap: 14 },
  agreementRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  agreementText: { flex: 1, color: Colors.textSecondary, fontSize: 12, lineHeight: 17 },
});

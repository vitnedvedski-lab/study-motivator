/**
 * PIN и режим доступа
 */
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Lock, Unlock } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAppTheme } from '../hooks/useAppTheme';
import { useUIStore } from '../stores/uiStore';

export default function PinScreen() {
  const router = useRouter();
  const palette = useAppTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { settings, setPinCode, setPinEnabled, setAccessMode, verifyPin } = useUIStore();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [unlockPin, setUnlockPin] = useState('');
  const [error, setError] = useState('');

  const validatePin = (value: string) => /^\d{4,6}$/.test(value);

  const handleSavePin = () => {
    setError('');
    if (!validatePin(pin)) {
      setError('PIN должен содержать 4-6 цифр.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PIN и подтверждение не совпадают.');
      return;
    }
    setPinCode(pin);
    Alert.alert('Готово', 'PIN включён.');
  };

  const handleDisablePin = () => {
    setPinCode(undefined);
    setPinEnabled(false);
    setAccessMode('parent');
    setPin('');
    setConfirmPin('');
    setUnlockPin('');
  };

  const handleChildMode = () => {
    if (!settings.pinEnabled) {
      setError('Сначала установите PIN для родительского режима.');
      return;
    }
    setError('');
    setAccessMode('child');
    router.replace('/(tabs)');
  };

  const handleParentMode = () => {
    setError('');
    if (!verifyPin(unlockPin)) {
      setError('Неверный PIN.');
      return;
    }
    setUnlockPin('');
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button
          title=""
          onPress={() => router.back()}
          variant="ghost"
          icon={<ChevronLeft size={24} color={Colors.textPrimary} />}
        />
        <Text style={styles.headerTitle}>PIN и режим</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.modeCard} variant="elevated">
          <View style={styles.modeIcon}>
            {settings.accessMode === 'parent' ? (
              <Unlock size={28} color={Colors.primary} />
            ) : (
              <Lock size={28} color={Colors.primary} />
            )}
          </View>
          <View style={styles.modeText}>
            <Text style={styles.modeTitle}>
              {settings.accessMode === 'parent' ? 'Родительский режим' : 'Детский режим'}
            </Text>
            <Text style={styles.modeSubtitle}>
              В детском режиме скрыты настройки и добавление активностей.
            </Text>
          </View>
        </Card>

        {/* Управлять PIN может только родитель: в детском режиме секция скрыта,
            чтобы ребёнок не мог отключить PIN или задать свой. */}
        {settings.accessMode === 'parent' && (
          <>
            <Text style={styles.sectionTitle}>Установка PIN</Text>
            <Card style={styles.formCard}>
              <Input
                label="PIN"
                value={pin}
                onChangeText={setPin}
                keyboardType="numeric"
                secureTextEntry
                placeholder="4-6 цифр"
              />
              <Input
                label="Повтор PIN"
                value={confirmPin}
                onChangeText={setConfirmPin}
                keyboardType="numeric"
                secureTextEntry
                placeholder="Повторите PIN"
              />
              <Button title="Сохранить PIN" onPress={handleSavePin} />
              {settings.pinEnabled && (
                <Button title="Отключить PIN" onPress={handleDisablePin} variant="outline" />
              )}
            </Card>
          </>
        )}

        <Text style={styles.sectionTitle}>Переключение режима</Text>
        <Card style={styles.formCard}>
          {settings.accessMode === 'parent' ? (
            <Button
              title="Перейти в детский режим"
              onPress={handleChildMode}
              icon={<Lock size={18} color={Colors.textInverse} />}
            />
          ) : (
            <>
              <Input
                label="PIN родителя"
                value={unlockPin}
                onChangeText={setUnlockPin}
                keyboardType="numeric"
                secureTextEntry
                placeholder="Введите PIN"
              />
              <Button
                title="Вернуться в родительский режим"
                onPress={handleParentMode}
                icon={<Unlock size={18} color={Colors.textInverse} />}
              />
            </>
          )}
        </Card>

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
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 40,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
  },
  modeIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryContainer,
  },
  modeText: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modeSubtitle: {
    marginTop: 4,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  formCard: {
    padding: 16,
    gap: 12,
  },
  errorText: {
    color: Colors.danger,
    textAlign: 'center',
    fontWeight: '600',
  },
});

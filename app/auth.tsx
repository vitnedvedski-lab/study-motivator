import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GraduationCap } from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { AuthService, isGoogleSignInConfigured } from '../services/authService';

export default function AuthScreen() {
  const Colors = useAppTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [parentName, setParentName] = useState('');
  const [accountRole, setAccountRole] = useState<'parent' | 'child'>('parent');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { setUser, setAuthenticated, signOut } = useAuthStore();
  const { updateSettings } = useUIStore();

  const handleEmailAuth = async () => {
    if (!email.trim() || !password) {
      setError('Введите email и пароль.');
      return;
    }

    if (isSignUp && !/^(?=.*[A-ZА-Я])(?=.*\d).{8,}$/.test(password)) {
      setError('Пароль должен быть не короче 8 символов, с заглавной буквой и цифрой.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');

    try {
      if (isSignUp) {
        await AuthService.signUpWithEmail(email, password);
        if (parentName.trim()) {
          updateSettings({ parentName: parentName.trim() });
        }
        updateSettings({ accessMode: accountRole });
        await AuthService.signOut();
        signOut();
        setPassword('');
        setConfirmPassword('');
        setIsSignUp(false);
        setInfo(accountRole === 'child'
          ? 'Аккаунт ребёнка создан. Теперь войдите и привяжите кабинет через QR или код родителя.'
          : 'Аккаунт создан. Теперь войдите с email и паролем.');
        return;
      }

      const user = await AuthService.signInWithEmail(email, password);
      updateSettings({ accessMode: accountRole });
      setUser(user);
      setAuthenticated(true);
    } catch (err: any) {
      setError(err.message ?? 'Ошибка авторизации.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setInfo('');

    try {
      const user = await AuthService.signInWithGoogle();
      setUser(user);
      setAuthenticated(true);
    } catch (err: any) {
      setError(err.message ?? 'Ошибка входа через Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setLoading(true);
    setError('');
    setInfo('');

    try {
      const user = await AuthService.signInAnonymously();
      setUser(user);
      setAuthenticated(true);
    } catch (err: any) {
      setError(err.message ?? 'Ошибка анонимного входа.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Введите email, чтобы отправить ссылку для сброса пароля.');
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');

    try {
      await AuthService.resetPassword(email);
      setInfo('Письмо для сброса пароля отправлено на email.');
    } catch (err: any) {
      setError(err.message ?? 'Не удалось отправить письмо.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <GraduationCap size={48} color={Colors.textInverse} />
            </View>
            <Text style={styles.appName}>Мотиватор учёбы</Text>
            <Text style={styles.subtitle}>Семейная система баллов, наград и школьного расписания</Text>
          </View>

          <View style={styles.formContainer}>
            {isSignUp && (
              <>
                <Text style={styles.inputLabel}>Тип аккаунта</Text>
                <View style={styles.roleRow}>
                  {[
                    { key: 'parent' as const, label: 'Родитель' },
                    { key: 'child' as const, label: 'Ребёнок' },
                  ].map((item) => {
                    const active = accountRole === item.key;
                    return (
                      <TouchableOpacity key={item.key} style={[styles.roleButton, active && styles.roleButtonActive]} onPress={() => setAccountRole(item.key)}>
                        <Text style={[styles.roleText, active && styles.roleTextActive]}>{item.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {accountRole === 'parent' && (
                  <Input
                    label="Имя родителя"
                    value={parentName}
                    onChangeText={setParentName}
                    placeholder="Как к вам обращаться"
                    accessibilityLabel="Имя родителя"
                  />
                )}
              </>
            )}

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              accessibilityLabel="Поле ввода email"
            />

            <Input
              label="Пароль"
              value={password}
              onChangeText={setPassword}
              placeholder={isSignUp ? '8+ символов, заглавная и цифра' : 'Ваш пароль'}
              secureTextEntry
              accessibilityLabel="Поле ввода пароля"
            />

            {isSignUp && (
              <Input
                label="Повторите пароль"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Введите пароль ещё раз"
                secureTextEntry
                accessibilityLabel="Повтор пароля"
              />
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {info ? <Text style={styles.infoText}>{info}</Text> : null}

            <Button
              title={isSignUp ? 'Создать аккаунт' : 'Войти'}
              onPress={handleEmailAuth}
              loading={loading}
              size="large"
            />

            {!isSignUp && (
              <Button
                title="Забыли пароль?"
                onPress={handleResetPassword}
                variant="ghost"
                size="small"
                disabled={loading}
              />
            )}

            <Button
              title={isSignUp ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
              onPress={() => {
                setIsSignUp(!isSignUp);
                setConfirmPassword('');
                setAccountRole('parent');
                setError('');
                setInfo('');
              }}
              variant="ghost"
              size="small"
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>или</Text>
              <View style={styles.dividerLine} />
            </View>

            {isGoogleSignInConfigured ? (
              <Button title="Войти через Google" onPress={handleGoogleSignIn} variant="outline" size="medium" />
            ) : null}

            <Button title="Продолжить анонимно" onPress={handleAnonymousSignIn} variant="ghost" size="medium" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 32,
  },
  logoContainer: {
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  formContainer: {
    gap: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  roleButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer,
  },
  roleText: {
    color: Colors.textSecondary,
    fontWeight: '800',
  },
  roleTextActive: {
    color: Colors.primary,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  infoText: {
    color: Colors.success,
    fontSize: 14,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.divider,
  },
  dividerText: {
    color: Colors.textTertiary,
    fontSize: 14,
  },
});

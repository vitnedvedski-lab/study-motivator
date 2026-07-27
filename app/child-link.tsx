/**
 * Связь родитель-ребёнок через QR-код
 */
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { Camera, ChevronLeft, Link, QrCode, X } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuthStore } from '../stores/authStore';
import { useChildStore } from '../stores/childStore';
import { useUIStore } from '../stores/uiStore';
import { ChildService } from '../services/childService';

const makeLinkUrl = (code: string) => `studymotivator://link/${code}`;

const extractCode = (value: string) => {
  const trimmed = value.trim();
  const match = trimmed.match(/(?:link\/|code=)([A-Z0-9]{3}-[A-Z0-9]{3})/i);
  return (match?.[1] ?? trimmed).toUpperCase();
};

export default function ChildLinkScreen() {
  const router = useRouter();
  const palette = useAppTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { user } = useAuthStore();
  const { selectedChild, addChild, selectChild } = useChildStore();
  const { settings, updateSettings } = useUIStore();
  const child = selectedChild();
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState(child?.linkCode ?? '');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const linkUrl = code ? makeLinkUrl(code) : '';

  const handleGenerate = async () => {
    if (!child) return;
    setLoading(true);
    try {
      const nextCode = await ChildService.generateLinkCode(child.id);
      setCode(nextCode);
    } catch (err: any) {
      Alert.alert('Ошибка', err.message ?? 'Не удалось создать QR-код.');
    } finally {
      setLoading(false);
    }
  };

  const linkChild = async (rawCode: string) => {
    if (!user) return;
    const normalizedCode = extractCode(rawCode);
    if (!normalizedCode) {
      Alert.alert('Код привязки', 'Введите или отсканируйте код с устройства родителя.');
      return;
    }

    setLoading(true);
    try {
      const linkedChild = await ChildService.linkChildByCode(normalizedCode, user.uid);
      addChild(linkedChild);
      selectChild(linkedChild.id);
      updateSettings({ accessMode: 'child' });
      Alert.alert('Готово', `Профиль "${linkedChild.name}" привязан к этому устройству.`);
      router.replace('/(tabs)');
    } catch (err: any) {
      setScanLocked(false);
      Alert.alert('Ошибка', err.message ?? 'Не удалось привязать ребёнка.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Камера', 'Разрешите доступ к камере, чтобы сканировать QR-код.');
        return;
      }
    }
    setScanLocked(false);
    setScanning(true);
  };

  if (scanning) {
    return (
      <SafeAreaView style={styles.scannerContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(result) => {
            if (scanLocked) return;
            setScanLocked(true);
            setScanning(false);
            linkChild(result.data);
          }}
        />
        <View style={styles.scannerOverlay}>
          <TouchableOpacity style={styles.closeScanner} onPress={() => setScanning(false)}>
            <X size={24} color={Colors.textInverse} />
          </TouchableOpacity>
          <View style={styles.scanFrame} />
          <Text style={styles.scanText}>Наведите камеру на QR-код родителя</Text>
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
        <Text style={styles.headerTitle}>Связь устройств</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, settings.accessMode !== 'parent' && styles.hidden]}>Для родителя</Text>
        <Card style={[styles.card, settings.accessMode !== 'parent' && styles.hidden]}>
          <View style={styles.iconBox}>
            <QrCode size={32} color={Colors.primary} />
          </View>
          <Text style={styles.title}>QR-код для ребёнка</Text>
          <Text style={styles.subtitle}>Покажите этот QR-код ребёнку. Код действует 24 часа.</Text>

          <View style={styles.qrBox}>
            {linkUrl ? (
              <QRCode value={linkUrl} size={190} backgroundColor="#FFFFFF" color="#1A1A1A" />
            ) : (
              <Text style={styles.qrPlaceholder}>QR появится после создания кода</Text>
            )}
          </View>

          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{code || '------'}</Text>
          </View>
          {linkUrl ? <Text style={styles.linkText}>{linkUrl}</Text> : null}
          <Button
            title={code ? 'Обновить QR-код' : 'Создать QR-код'}
            onPress={handleGenerate}
            loading={loading}
          />
        </Card>

        <Text style={[styles.sectionTitle, settings.accessMode !== 'child' && styles.hidden]}>Для ребёнка</Text>
        <Card style={[styles.card, settings.accessMode !== 'child' && styles.hidden]}>
          <View style={styles.iconBox}>
            <Link size={32} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Привязать профиль</Text>
          <Text style={styles.subtitle}>Отсканируйте QR-код родителя или введите код вручную.</Text>
          <Button
            title="Сканировать QR"
            onPress={handleOpenScanner}
            icon={<Camera size={18} color={Colors.textInverse} />}
          />
          <Input
            label="Код привязки"
            value={joinCode}
            onChangeText={(value) => setJoinCode(value.toUpperCase())}
            autoCapitalize="characters"
            placeholder="ABC-123"
          />
          <Button title="Привязать по коду" onPress={() => linkChild(joinCode)} loading={loading} variant="outline" />
        </Card>
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryContainer,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  qrBox: {
    width: 222,
    height: 222,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  qrPlaceholder: {
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  codeBox: {
    minWidth: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  linkText: {
    color: Colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  closeScanner: {
    position: 'absolute',
    top: 48,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  scanText: {
    marginTop: 22,
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  hidden: {
    display: 'none',
  },
});

/**
 * Zustand store для UI-состояния
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AppSettings } from '../types';
import { hashPin, isHashedPin, verifyPinValue } from '../utils/pinHash';

interface UIState {
  settings: AppSettings;

  bottomSheetVisible: boolean;
  bottomSheetContent: 'childSelector' | 'filter' | 'gradeSelector' | null;

  toastVisible: boolean;
  toastMessage: string;
  toastType: 'success' | 'error' | 'info';

  pinEnabled: boolean;
  isPinVerified: boolean;

  updateSettings: (settings: Partial<AppSettings>) => void;
  showBottomSheet: (content: UIState['bottomSheetContent']) => void;
  hideBottomSheet: () => void;
  showToast: (message: string, type?: UIState['toastType']) => void;
  hideToast: () => void;
  setPinEnabled: (value: boolean) => void;
  setPinCode: (pinCode?: string) => void;
  verifyPin: (pinCode: string) => boolean;
  setAccessMode: (mode: AppSettings['accessMode']) => void;
  setPinVerified: (value: boolean) => void;
  toggleTheme: () => void;
}

const defaultSettings: AppSettings = {
  language: 'ru',
  theme: 'system',
  subscription: 'free',
  parentName: undefined,
  pinEnabled: false,
  pinCode: undefined,
  accessMode: 'parent',
  biometricEnabled: false,
  notificationsEnabled: true,
  soundEnabled: true,
  hapticsEnabled: true,
};

export const useUIStore = create<UIState>()(persist((set, get) => ({
  settings: { ...defaultSettings },
  bottomSheetVisible: false,
  bottomSheetContent: null,
  toastVisible: false,
  toastMessage: '',
  toastType: 'info',
  pinEnabled: false,
  isPinVerified: false,

  updateSettings: (newSettings) =>
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),

  showBottomSheet: (content) =>
    set({ bottomSheetVisible: true, bottomSheetContent: content }),

  hideBottomSheet: () =>
    set({ bottomSheetVisible: false, bottomSheetContent: null }),

  showToast: (message, type = 'info') =>
    set({ toastVisible: true, toastMessage: message, toastType: type }),

  hideToast: () =>
    set({ toastVisible: false, toastMessage: '', toastType: 'info' }),

  setPinEnabled: (value) =>
    set((state) => ({
      pinEnabled: value,
      settings: {
        ...state.settings,
        pinEnabled: value,
        accessMode: value ? state.settings.accessMode : 'parent',
      },
      isPinVerified: !value,
    })),

  // PIN хранится только в виде хэша.
  setPinCode: (pinCode) =>
    set((state) => ({
      settings: {
        ...state.settings,
        pinCode: pinCode ? hashPin(pinCode) : undefined,
        pinEnabled: !!pinCode,
      },
      pinEnabled: !!pinCode,
      isPinVerified: !!pinCode,
    })),

  verifyPin: (pinCode) => {
    const stored = get().settings.pinCode;
    const ok = verifyPinValue(stored, pinCode);
    if (ok) {
      set((state) => ({
        isPinVerified: true,
        settings: {
          ...state.settings,
          accessMode: 'parent',
          // Миграция: если PIN лежал в открытом виде — заменяем на хэш.
          pinCode: stored && !isHashedPin(stored) ? hashPin(pinCode) : stored,
        },
      }));
    }
    return ok;
  },

  setAccessMode: (mode) =>
    set((state) => ({
      settings: { ...state.settings, accessMode: mode },
      isPinVerified: mode === 'child' ? false : state.isPinVerified,
    })),

  setPinVerified: (value) => set({ isPinVerified: value }),

  toggleTheme: () =>
    set((state) => ({
      settings: {
        ...state.settings,
        theme:
          state.settings.theme === 'light'
            ? 'dark'
            : state.settings.theme === 'dark'
            ? 'system'
            : 'light',
      },
    })),
}), {
  name: 'study-motivator-ui',
  storage: createJSONStorage(() => AsyncStorage),
  // isPinVerified намеренно не сохраняем: после перезапуска приложения
  // PIN должен запрашиваться заново.
  partialize: (state) => ({
    settings: state.settings,
    pinEnabled: state.pinEnabled,
  }),
}));

/**
 * Zustand store для авторизации (без persist для MVP)
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onboardingCompleted: boolean;
  setUser: (user: User | null) => void;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setOnboardingCompleted: (value: boolean) => void;
  completeOnboarding: () => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(persist((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  onboardingCompleted: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setLoading: (value) => set({ isLoading: value }),
  setOnboardingCompleted: (value) => set({ onboardingCompleted: value }),
  completeOnboarding: () => set({ onboardingCompleted: true }),
  signOut: () => set({ user: null, isAuthenticated: false, onboardingCompleted: false }),
}), {
  name: 'study-motivator-auth',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({ onboardingCompleted: state.onboardingCompleted }),
}));

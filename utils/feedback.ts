import { Vibration } from 'react-native';
import { useUIStore } from '../stores/uiStore';

type FeedbackKind = 'tap' | 'success' | 'warning';

export const playFeedback = (kind: FeedbackKind = 'tap') => {
  const { settings } = useUIStore.getState();
  if (settings.hapticsEnabled !== false) {
    const duration = kind === 'success' ? 30 : kind === 'warning' ? 45 : 12;
    Vibration.vibrate(duration);
  }
};

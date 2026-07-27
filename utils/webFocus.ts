import { Platform } from 'react-native';

export const blurActiveElementOnWeb = () => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  const activeElement = document.activeElement;
  if (activeElement && 'blur' in activeElement) {
    (activeElement as HTMLElement).blur();
  }
};

/**
 * Инициализация Firebase
 * Замените конфигурацию на свою из Firebase Console
 */
import { initializeApp, getApps, getApp } from '@react-native-firebase/app';

const firebaseConfig = {
  apiKey: 'AIzaSyB-5m9F8p8MjQEwD16WXUrlLL17VCbO_Mc',
  authDomain: 'school-f628b.firebaseapp.com',
  databaseURL: 'https://school-f628b-default-rtdb.firebaseio.com',
  projectId: 'school-f628b',
  storageBucket: 'school-f628b.firebasestorage.app',
  messagingSenderId: '205397389043',
  appId: '1:205397389043:android:2368362f2a58c286149186',
};

export const getFirebaseApp = () => {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
};

export const app = getFirebaseApp();

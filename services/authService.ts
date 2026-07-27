import './firebase';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { User } from '../types';

const GOOGLE_WEB_CLIENT_ID = '';

export const isGoogleSignInConfigured = GOOGLE_WEB_CLIENT_ID.length > 0;

if (isGoogleSignInConfigured) {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });
}

const getAuthErrorMessage = (error: any) => {
  const code = error?.code ?? '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Этот email уже зарегистрирован.';
    case 'auth/invalid-email':
      return 'Введите корректный email.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Неверный email или пароль.';
    case 'auth/weak-password':
      return 'Пароль должен быть не короче 8 символов, с заглавной буквой и цифрой.';
    case 'auth/operation-not-allowed':
      return 'Этот способ входа не включен в Firebase Authentication.';
    case 'auth/configuration-not-found':
      return 'Firebase Authentication не настроен. Включите Email/Password в Firebase Console.';
    case 'auth/network-request-failed':
      return 'Нет соединения с Firebase. Проверьте интернет.';
    default:
      return error?.message ?? 'Ошибка авторизации.';
  }
};

export class AuthService {
  static async signUpWithEmail(email: string, password: string): Promise<User> {
    if (!/^(?=.*[A-ZА-Я])(?=.*\d).{8,}$/.test(password)) {
      throw new Error('Пароль должен быть не короче 8 символов, с заглавной буквой и цифрой.');
    }

    try {
      const result = await auth().createUserWithEmailAndPassword(email.trim(), password);
      return this.mapFirebaseUser(result.user);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }

  static async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const result = await auth().signInWithEmailAndPassword(email.trim(), password);
      return this.mapFirebaseUser(result.user);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }

  static async signInWithGoogle(): Promise<User> {
    if (!isGoogleSignInConfigured) {
      throw new Error('Вход через Google не настроен: в Firebase нет OAuth client ID.');
    }

    try {
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        throw new Error('Google не вернул ID token.');
      }

      const credential = auth.GoogleAuthProvider.credential(idToken);
      const result = await auth().signInWithCredential(credential);
      return this.mapFirebaseUser(result.user);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }

  static async signInAnonymously(): Promise<User> {
    try {
      const result = await auth().signInAnonymously();
      return this.mapFirebaseUser(result.user);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }

  static async signOut(): Promise<void> {
    if (isGoogleSignInConfigured) {
      await GoogleSignin.signOut();
    }

    await auth().signOut();
  }

  static onAuthStateChanged(callback: (user: User | null) => void) {
    return auth().onAuthStateChanged((fbUser) => {
      callback(fbUser ? this.mapFirebaseUser(fbUser) : null);
    });
  }

  static async resetPassword(email: string): Promise<void> {
    try {
      await auth().sendPasswordResetEmail(email.trim());
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }

  private static mapFirebaseUser(fbUser: any): User {
    return {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      photoURL: fbUser.photoURL,
      isAnonymous: fbUser.isAnonymous,
      createdAt: fbUser.metadata.creationTime
        ? new Date(fbUser.metadata.creationTime).getTime()
        : Date.now(),
    };
  }
}

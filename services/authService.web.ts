import { User } from '../types';

export const isGoogleSignInConfigured = false;

const createWebUser = (email: string | null = null): User => ({
  uid: `web-${Date.now()}`,
  email,
  displayName: email ? email.split('@')[0] : 'Web user',
  photoURL: null,
  isAnonymous: !email,
  createdAt: Date.now(),
});

export class AuthService {
  static async signUpWithEmail(email: string): Promise<User> {
    return createWebUser(email);
  }

  static async signInWithEmail(email: string): Promise<User> {
    return createWebUser(email);
  }

  static async signInWithGoogle(): Promise<User> {
    return createWebUser('google-user@example.com');
  }

  static async signInAnonymously(): Promise<User> {
    return createWebUser();
  }

  static async signOut(): Promise<void> {
    return undefined;
  }

  static onAuthStateChanged(callback: (user: User | null) => void) {
    callback(null);
    return () => undefined;
  }

  static async resetPassword(): Promise<void> {
    return undefined;
  }
}

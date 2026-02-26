// src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  signOut,
  User,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

const authCodeKey = (uid: string) => `jagadoku-auth-code-required-${uid}`;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  needsAuthCode: boolean;
  signInWithGoogle: () => Promise<{ isNewUser: boolean }>;
  logout: () => Promise<void>;
  markAuthCodeVerified: () => void;
  updateDisplayName: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialUser: User | null = (auth && auth.currentUser) ? auth.currentUser : null;
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState<boolean>(() => Boolean(auth));
  // Auth code is no longer required for new users
  const [needsAuthCode, setNeedsAuthCode] = useState<boolean>(false);
  const googleProvider = new GoogleAuthProvider();

  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });

  useEffect(() => {
    if (!auth) {
      // Firebase auth not initialized (missing env or running server-side).
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      // Selalu set needsAuthCode ke false
      setNeedsAuthCode(false);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase auth is not initialized');
    const result = await signInWithPopup(auth, googleProvider);
    const additional = getAdditionalUserInfo(result);
    const isNewUser = Boolean(additional?.isNewUser);

    if (result.user && typeof window !== 'undefined') {
      // Tidak perlu auth code untuk user baru
      setNeedsAuthCode(false);
    }

    return { isNewUser };
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  const markAuthCodeVerified = () => {
    if (!user || typeof window === 'undefined') return;
    localStorage.removeItem(authCodeKey(user.uid));
    setNeedsAuthCode(false);
  };

  const updateDisplayName = async (displayName: string) => {
    if (!user) throw new Error('User not authenticated');
    await updateProfile(user, { displayName });
    setUser({ ...user, displayName });
  };

  return (
    <AuthContext.Provider value={{ user, loading, needsAuthCode, signInWithGoogle, logout, markAuthCodeVerified, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
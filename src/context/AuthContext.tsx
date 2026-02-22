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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuthCode, setNeedsAuthCode] = useState(false);
  const googleProvider = new GoogleAuthProvider();

  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user && typeof window !== 'undefined') {
        const required = localStorage.getItem(authCodeKey(user.uid)) === 'true';
        setNeedsAuthCode(required);
      } else {
        setNeedsAuthCode(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const additional = getAdditionalUserInfo(result);
    const isNewUser = Boolean(additional?.isNewUser);

    if (result.user && typeof window !== 'undefined') {
      if (isNewUser) {
        localStorage.setItem(authCodeKey(result.user.uid), 'true');
        setNeedsAuthCode(true);
      } else {
        const required = localStorage.getItem(authCodeKey(result.user.uid)) === 'true';
        setNeedsAuthCode(required);
      }
    }

    return { isNewUser };
  };

  const logout = async () => {
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
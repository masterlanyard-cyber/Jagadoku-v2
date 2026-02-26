// src/app/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, user, loading: authLoading, needsAuthCode } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to home if already logged in
    if (!authLoading && user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      router.push('/');
    } catch (err: unknown) {
      const code = typeof err === 'object' && err && 'code' in err ? (err as { code?: string }).code : undefined;
      const message = typeof err === 'object' && err && 'message' in err ? (err as { message?: string }).message : undefined;
      if (code === 'auth/popup-closed-by-user') {
        setError('Login dibatalkan. Silakan coba lagi.');
      } else {
        setError(message || 'Login Google gagal. Coba beberapa saat lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <div className="mx-auto mb-3 h-24 w-24 rounded-2xl overflow-hidden bg-white dark:bg-gray-900">
            <Image
              src="/icons/android-chrome-192x192.png"
              alt="Jagadoku"
              width={96}
              height={96}
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">JagaDoku</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Manajemen Keuangan Personal</p>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Masuk dengan akun Google (Gmail)</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Memproses...' : 'Masuk dengan Google'}
          </button>
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">Terinspirasi oleh Agus</p>
        </div>
      </div>
    </div>
  );
}
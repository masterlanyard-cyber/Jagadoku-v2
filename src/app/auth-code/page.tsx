'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { sendAuthCodeToEmail, verifyAuthCode } from '@/lib/authCode';

export default function AuthCodePage() {
  const router = useRouter();
  const { user, loading, needsAuthCode, markAuthCodeVerified } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (!loading && user && !needsAuthCode) {
      router.push('/');
    }
  }, [loading, user, needsAuthCode, router]);

  const handleSendCode = async () => {
    if (!user?.email) {
      setError('Email user tidak ditemukan.');
      return;
    }

    setError('');
    setSuccess('');
    setSending(true);

    try {
      await sendAuthCodeToEmail(user.email, user.uid);
      setSuccess(`Kode autentikasi sudah dikirim ke ${user.email}`);
    } catch (err: unknown) {
      const message = typeof err === 'object' && err && 'message' in err ? (err as { message?: string }).message : undefined;
      setError(message || 'Gagal mengirim kode.');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setVerifying(true);

    const result = verifyAuthCode(user?.uid || '', code);
    if (!result.valid) {
      setError(result.message);
      setVerifying(false);
      return;
    }

    markAuthCodeVerified();
    setSuccess('Verifikasi berhasil. Mengarahkan ke dashboard...');
    setTimeout(() => {
      router.push('/');
    }, 500);
  };

  if (loading || !user || !needsAuthCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Kode Otentikasi</h1>
          <p className="mt-2 text-gray-600 text-sm">
            Untuk keamanan akun baru, masukkan kode yang dikirim ke Gmail Anda.
          </p>
          <p className="text-gray-500 text-xs mt-1">{user.email}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        <button
          type="button"
          onClick={handleSendCode}
          disabled={sending}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {sending ? 'Mengirim...' : 'Kirim Kode ke Gmail'}
        </button>

        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kode Otentikasi</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              placeholder="6 digit kode"
            />
          </div>

          <button
            type="submit"
            disabled={verifying || code.length !== 6}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {verifying ? 'Memverifikasi...' : 'Verifikasi Kode'}
          </button>
        </form>
      </div>
    </div>
  );
}

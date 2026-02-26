"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout, updateDisplayName, needsAuthCode } = useAuth();
  
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [editingName, setEditingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  // Tidak perlu redirect ke /auth-code lagi

  const handleUpdateDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    setNameSuccess("");

    if (!displayName.trim()) {
      setNameError("Nama tidak boleh kosong!");
      return;
    }

    try {
      await updateDisplayName(displayName.trim());
      setNameSuccess("Nama berhasil diubah!");
      setEditingName(false);
      setTimeout(() => setNameSuccess(""), 3000);
    } catch (error: unknown) {
      const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;
      setNameError(message || "Gagal mengubah nama");
    }
  };

  const handleLogout = async () => {
    if (confirm("Yakin mau keluar?")) {
      await logout();
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-slate-900 dark:to-indigo-950 p-4 pb-24">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6 pt-4">
          <Link href="/" className="text-white hover:text-indigo-100 font-medium">← Kembali</Link>
          <h1 className="text-white font-bold text-lg">Profil</h1>
          <div className="w-16"></div>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-2xl p-6 mb-4">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-3xl">{user.email?.[0].toUpperCase()}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{user.displayName || "Pengguna"}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{user.email}</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Masuk dengan Google</p>
          </div>

          {/* Edit Name Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Nama</h3>
            
            {nameError && <div className="p-3 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl text-sm mb-4">{nameError}</div>}
            {nameSuccess && <div className="p-3 bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 rounded-xl text-sm mb-4">{nameSuccess}</div>}

            {editingName ? (
              <form onSubmit={handleUpdateDisplayName} className="space-y-3">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Masukkan nama baru"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingName(false);
                      setDisplayName(user.displayName || "");
                      setNameError("");
                    }}
                    className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-all"
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => {
                  setEditingName(true);
                  setDisplayName(user.displayName || "");
                }}
                className="w-full py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-all border border-gray-200 dark:border-gray-600"
              >
                Ubah Nama
              </button>
            )}
          </div>

        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all active:scale-95"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
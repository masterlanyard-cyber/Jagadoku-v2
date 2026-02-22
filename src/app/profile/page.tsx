"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout, changePassword, updateDisplayName } = useAuth();
  
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [editingName, setEditingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

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
    } catch (error: any) {
      setNameError(error.message || "Gagal mengubah nama");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!oldPassword) {
      setPasswordError("Masukkan password lama!");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password baru minimal 6 karakter!");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Password baru dan konfirmasi tidak cocok!");
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(oldPassword, newPassword);
      setPasswordSuccess("Password berhasil diubah!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(""), 3000);
    } catch (error: any) {
      if (error.code === "auth/wrong-password" || error.message?.includes("password")) {
        setPasswordError("Password lama tidak sesuai!");
      } else {
        setPasswordError(error.message || "Gagal mengubah password");
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    if (confirm("Yakin mau keluar?")) {
      await logout();
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4 pb-24">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6 pt-4">
          <Link href="/" className="text-white hover:text-indigo-100 font-medium">← Kembali</Link>
          <h1 className="text-white font-bold text-lg">Profil</h1>
          <div className="w-16"></div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-3xl">{user.email?.[0].toUpperCase()}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{user.displayName || "Pengguna"}</h2>
            <p className="text-gray-500 text-sm">{user.email}</p>
          </div>

          {/* Edit Name Section */}
          <div className="border-t pt-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Edit Nama</h3>
            
            {nameError && <div className="p-3 bg-red-100 text-red-700 rounded-xl text-sm mb-4">{nameError}</div>}
            {nameSuccess && <div className="p-3 bg-green-100 text-green-700 rounded-xl text-sm mb-4">{nameSuccess}</div>}

            {editingName ? (
              <form onSubmit={handleUpdateDisplayName} className="space-y-3">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Masukkan nama baru"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none transition-all"
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
                    className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-all"
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
                className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-all border border-gray-200"
              >
                Ubah Nama
              </button>
            )}
          </div>

          {/* Change Password Section */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Ganti Password</h3>
            
            {passwordError && <div className="p-3 bg-red-100 text-red-700 rounded-xl text-sm mb-4">{passwordError}</div>}
            {passwordSuccess && <div className="p-3 bg-green-100 text-green-700 rounded-xl text-sm mb-4">{passwordSuccess}</div>}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password Lama</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Masukkan password lama"
                  disabled={changingPassword}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none transition-all disabled:bg-gray-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password Baru (min 6 karakter)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru"
                  disabled={changingPassword}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none transition-all disabled:bg-gray-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Konfirmasi password baru"
                  disabled={changingPassword}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none transition-all disabled:bg-gray-100"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!oldPassword || !newPassword || !confirmPassword || changingPassword}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-all"
              >
                {changingPassword ? "Mengubah..." : "Simpan Password Baru"}
              </button>
            </form>
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
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  pin: string;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const activeUser = localStorage.getItem("jagadoku-active-user");
    if (!activeUser) {
      router.push("/login/");
      return;
    }
    setCurrentUser(JSON.parse(activeUser));
    setIsLoaded(true);
  }, [router]);

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentUser) return;

    if (oldPin !== currentUser.pin) {
      setError("PIN lama salah!");
      return;
    }

    if (newPin.length < 4) {
      setError("PIN baru minimal 4 digit!");
      return;
    }

    if (newPin !== confirmPin) {
      setError("PIN baru dan konfirmasi tidak cocok!");
      return;
    }

    const updatedUser = { ...currentUser, pin: newPin };
    setCurrentUser(updatedUser);
    localStorage.setItem("jagadoku-active-user", JSON.stringify(updatedUser));
    
    const savedUsers = localStorage.getItem("jagadoku-users");
    if (savedUsers) {
      const users: User[] = JSON.parse(savedUsers);
      const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
      localStorage.setItem("jagadoku-users", JSON.stringify(updatedUsers));
    }

    setOldPin("");
    setNewPin("");
    setConfirmPin("");
    setSuccess("PIN berhasil diubah!");
  };

  const handleLogout = () => {
    localStorage.removeItem("jagadoku-active-user");
    router.push("/login/");
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6 pt-4">
          <Link href="/" className="text-white hover:text-indigo-100">← Kembali</Link>
          <h1 className="text-white font-bold text-lg">Profil</h1>
          <div className="w-8"></div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-3xl">{currentUser?.name.charAt(0).toUpperCase()}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{currentUser?.name}</h2>
            <p className="text-gray-500 text-sm">Bergabung: {new Date(currentUser?.createdAt || "").toLocaleDateString("id-ID")}</p>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Ganti PIN</h3>
            
            {error && <div className="p-3 bg-red-100 text-red-700 rounded-xl text-sm mb-4">{error}</div>}
            {success && <div className="p-3 bg-green-100 text-green-700 rounded-xl text-sm mb-4">{success}</div>}

            <form onSubmit={handleChangePin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PIN Lama</label>
                <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" className="w-full px-4 py-3 text-center text-2xl tracking-widest rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none transition-all" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PIN Baru (4-6 digit)</label>
                <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" className="w-full px-4 py-3 text-center text-2xl tracking-widest rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none transition-all" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Konfirmasi PIN Baru</label>
                <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" className="w-full px-4 py-3 text-center text-2xl tracking-widest rounded-xl border-2 border-gray-200 focus:border-indigo-500 outline-none transition-all" required />
              </div>

              <button type="submit" disabled={oldPin.length < 4 || newPin.length < 4 || confirmPin.length < 4} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-all active:scale-95">Simpan PIN Baru</button>
            </form>
          </div>
        </div>

        <button onClick={handleLogout} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all active:scale-95">Keluar</button>
      </div>
    </div>
  );
}
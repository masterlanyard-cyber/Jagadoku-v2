"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTransactions } from "@/hooks/useTransactions";
import { useBudgets } from "@/hooks/useBudgets";
import ChartSection from "@/components/ChartSection";
import ReminderAlert from "@/components/ReminderAlert";
import { exportToCSV } from "@/lib/firestore";
import FloatingActionButton from "@/components/FloatingActionButton";
import OverBudgetWarning from "@/components/OverBudgetWarning";
import { parseLocalDate } from "@/lib/date";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatRelativeDate(dateString: string): string {
  const date = parseLocalDate(dateString);
  const now = new Date();

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = nowOnly.getTime() - dateOnly.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return `${diffDays} hari lalu`;

  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function hexToRgb(hex: string) {
  const cleaned = hex.replace("#", "");
  const full = cleaned.length === 3
    ? cleaned.split("").map(c => c + c).join("")
    : cleaned;
  const value = parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function blendHex(base: string, mix: string, amount: number) {
  const a = hexToRgb(base);
  const b = hexToRgb(mix);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return rgbToHex(
    clamp(a.r + (b.r - a.r) * amount),
    clamp(a.g + (b.g - a.g) * amount),
    clamp(a.b + (b.b - a.b) * amount)
  );
}


type Transaction = {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  date: string;
  icon: string;
  note?: string;
};

const initialTransactions: Transaction[] = [];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout, needsAuthCode } = useAuth();
  const { transactions, addTransaction, isLoadingFromFirestore } = useTransactions(initialTransactions);
  const { budgets, loadingBudgets } = useBudgets();
  const [showModal, setShowModal] = useState<"income" | "expense" | null>(null);

  useEffect(() => {
    // Redirect to login if user is not authenticated
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (!loading && user && needsAuthCode) {
      router.push('/auth-code');
      return;
    }
  }, [user, loading, needsAuthCode, router]);

  const income = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expense;

  // Sort transactions by date (newest first) and get recent 5
  const sortedAllTransactions = [...transactions].sort((a, b) => {
    const dateA = parseLocalDate(a.date).getTime();
    const dateB = parseLocalDate(b.date).getTime();
    return dateB - dateA; // Newest first
  });
  const recentTransactions = sortedAllTransactions.slice(0, 5);
  const displayName = user?.displayName
    || user?.email?.split("@")[0]
    || "User";
  const expensePercent = balance ? Math.round((expense / Math.abs(balance)) * 100) : 0;

  const getCategoryData = () => {
    const expenses = transactions.filter(t => t.type === "expense");
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);

    const categories: Record<string, { amount: number; color: string; icon: string }> = {
      "Makanan": { amount: 0, color: "#ef4444", icon: "🍔" },
      "Transportasi": { amount: 0, color: "#3b82f6", icon: "🚗" },
      "Belanja": { amount: 0, color: "#8b5cf6", icon: "🛍️" },
      "Hiburan": { amount: 0, color: "#f59e0b", icon: "🎬" },
      "Utilitas": { amount: 0, color: "#10b981", icon: "💡" },
      "Lainnya": { amount: 0, color: "#6b7280", icon: "📦" },
    };

    expenses.forEach(t => {
      if (categories[t.category]) {
        categories[t.category].amount += t.amount;
      } else {
        categories["Lainnya"].amount += t.amount;
      }
    });

    return Object.entries(categories)
      .filter(([, data]) => data.amount > 0)
      .map(([name, data]) => ({
        name,
        value: data.amount,
        percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
        color: data.color,
        icon: data.icon,
      }))
      .sort((a, b) => b.value - a.value);
  };

  const categoryData = getCategoryData();
  const topCategory = categoryData[0];

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };



  if (loading || isLoadingFromFirestore) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (loadingBudgets) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!user) {
    return null;
  }

  if (needsAuthCode) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 pt-4 pb-0">
          <OverBudgetWarning transactions={transactions} budgets={budgets} className="mb-3" />
        </div>
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-white">
              <Image
                src="/icons/android-chrome-192x192.png"
                alt="Jagadoku"
                width={48}
                height={48}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-gray-900">Jagadoku</span>
              <span className="text-xs text-gray-500">Manajemen Keuangan Personal</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/profile/" className="p-2 hover:bg-gray-100 rounded-full" title="Profil">
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>

            <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-full" title="Logout">
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Halo, {displayName}! 👋</h1>
          <p className="text-gray-600 mt-1">Kelola keuanganmu dengan pintar</p>
        </div>

        <div className="grid grid-cols-2 gap-3">

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Total Saldo</span>
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900 truncate">{formatRupiah(balance)}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer" onClick={() => setShowModal("income")}> 
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Pemasukan</span>
              <div className="p-1.5 bg-green-100 rounded-lg">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900 truncate">{formatRupiah(income)}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer" onClick={() => setShowModal("expense")}> 
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Pengeluaran</span>
              <div className="p-1.5 bg-red-100 rounded-lg">
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900 truncate">{formatRupiah(expense)}</p>
            <span className="text-xs text-red-600">↓ {expensePercent}% dari total saldo</span>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Kategori Top</span>
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900 truncate">
              {topCategory ? `${topCategory.icon} ${topCategory.name}` : "-"}
            </p>
            <span className="text-xs text-amber-600">
              {topCategory ? `${topCategory.percentage}% dari pengeluaran` : "Belum ada data"}
            </span>
          </div>
        </div>
      {/* Modal tampil data pemasukan/pengeluaran */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowModal(null)}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-900">{showModal === "income" ? "Data Pemasukan" : "Data Pengeluaran"}</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {transactions.filter(t => t.type === showModal).length === 0 ? (
                <p className="text-gray-500">Tidak ada data.</p>
              ) : (
                transactions.filter(t => t.type === showModal).map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <span className="text-2xl">{t.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{t.description}</div>
                      <div className="text-xs text-gray-500">{t.category} • {formatRelativeDate(t.date)}</div>
                    </div>
                    <span className={showModal === "income" ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                      {formatRupiah(t.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}



        <ReminderAlert transactions={transactions} />

        <ChartSection transactions={transactions} />

        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-xl shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">💡 Insight AI</h3>
              <p className="text-indigo-100 text-xs leading-relaxed">
                {topCategory
                  ? `Pengeluaran ${topCategory.name} terbesar (${topCategory.percentage}%). Coba kurangi untuk hemat lebih banyak!`
                  : "Tambah transaksi untuk mendapatkan insight dari AI."}
              </p>
            </div>
          </div>
        </div>

        {categoryData.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Distribusi Pengeluaran & Budgeting</h3>
            <div className="space-y-2">
              {categoryData.map((cat) => {
                const budget = budgets[cat.name];
                const usageRatio = budget ? cat.value / budget : null;
                const usagePercent = budget
                  ? Math.min(100, Math.round(usageRatio! * 100))
                  : cat.percentage;
                const darkColor = blendHex(cat.color, "#000000", 0.25);

                return (
                  <div key={cat.name} className="flex items-start gap-3">
                    <span className="text-lg leading-6">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <span className="text-sm text-gray-700 truncate">{cat.name}</span>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-medium text-gray-900">{formatRupiah(cat.value)}</div>
                          {budget && (
                            <div className={usageRatio! >= 1
                              ? "text-xs text-red-600"
                              : "text-xs text-indigo-600"}
                            >
                              Batas: {formatRupiah(budget)} ({usagePercent}%)
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${usagePercent}%`,
                            backgroundImage: `linear-gradient(90deg, ${blendHex(cat.color, "#ffffff", 0.15)}, ${darkColor})`,
                          }}
                        />
                      </div>
                    </div>
                    {budget && usageRatio! >= 1 && (
                      <span className="text-xs text-red-600 font-semibold shrink-0">Over</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Transaksi Terbaru</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportToCSV(transactions.map(t => ({ ...t, note: (t as unknown as Transaction).note ?? '' })))}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700"
              >
                Download CSV
              </button>
              <Link href="/transactions" className="text-xs text-indigo-600 font-medium hover:text-indigo-700">
                Lihat Semua
              </Link>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Belum ada transaksi</p>
              </div>
            ) : (
              recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                    t.type === "income" ? "bg-green-100" : "bg-gray-100"
                  }`}>
                    {t.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{t.description}</p>
                    <p className="text-xs text-gray-500">{t.category} • {formatRelativeDate(t.date)}</p>
                  </div>
                  <span className={`font-semibold text-sm shrink-0 ${
                    t.type === "income" ? "text-green-600" : "text-red-600"
                  }`}>
                    {t.type === "income" ? "+" : "-"}{formatRupiah(t.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-40">
        <div className="flex items-center justify-around px-2 py-2">
          <Link href="/" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-indigo-600 bg-indigo-50">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Beranda</span>
          </Link>

          <Link href="/transactions" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-xs font-medium">Transaksi</span>
          </Link>

          <Link href="/budget" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            <span className="text-xs font-medium">Anggaran</span>
          </Link>

          {/* AI menu removed */}
        </div>
        <div className="h-1 w-32 bg-gray-300 rounded-full mx-auto mb-2"></div>
      </nav>

      <FloatingActionButton onCreateTransaction={addTransaction} />
    </div>
  );
}
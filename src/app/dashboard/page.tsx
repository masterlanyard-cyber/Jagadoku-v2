"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ChartSection from "@/components/ChartSection";
import ReminderAlert from "@/components/ReminderAlert";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return `${diffDays} hari lalu`;

  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

type Transaction = {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  date: string;
  icon: string;
};

const initialTransactions: Transaction[] = [];

export default function DashboardPage() {
  const [budgets, setBudgets] = useLocalStorage("jagadoku-budgets", {} as Record<string, number>);
  const [budgetInput, setBudgetInput] = useState<Record<string, string>>({});
  const [transactions, setTransactions] = useLocalStorage("jagadoku-transactions-v2", initialTransactions);
  const [isLoaded, setIsLoaded] = useState(false);
  const [balance, setBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [showModal, setShowModal] = useState<"income" | "expense" | null>(null);

  useEffect(() => {
    setIsLoaded(true);
    const inc = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const exp = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    setIncome(inc);
    setExpense(exp);
    setBalance(inc - exp);
  }, [transactions]);

  const recentTransactions = transactions.slice(0, 5);

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
      .filter(([_, data]) => data.amount > 0)
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
  const overBudgetCategories = categoryData.filter(cat => budgets[cat.name] && cat.value > budgets[cat.name]);

  if (!isLoaded) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white">
              <img
                src="/icons/android-chrome-192x192.png"
                alt="Jagadoku"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-gray-900">Jagadoku</span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/profile/" className="p-2 hover:bg-gray-100 rounded-full" title="Profil">
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>

            <Link href="/login/" className="p-2 hover:bg-gray-100 rounded-full" title="Logout">
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Halo! 👋</h1>
          <p className="text-gray-600 mt-1">Kelola keuanganmu dengan pintar</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
                  {/* Notifikasi jika ada kategori melebihi budget */}
                  {overBudgetCategories.length > 0 && (
                    <div className="bg-red-100 border border-red-300 rounded-xl p-3 mb-4">
                      <div className="font-semibold text-red-700 mb-1">⚠️ Anggaran Terlampaui!</div>
                      <ul className="text-sm text-red-600 list-disc pl-5">
                        {overBudgetCategories.map(cat => (
                          <li key={cat.name}>
                            {cat.icon} {cat.name}: {formatRupiah(cat.value)} dari batas {formatRupiah(budgets[cat.name])}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
            <span className="text-xs text-green-600">↑ 12%</span>
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
            <span className="text-xs text-green-600">↑ 5%</span>
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
            <span className="text-xs text-red-600">↓ 8%</span>
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
              {categoryData.map((cat) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="text-lg">{cat.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{cat.name}</span>
                      <span className="text-gray-500">{cat.percentage}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 shrink-0">
                    {formatRupiah(cat.value)}
                  </span>
                  {/* Input batas anggaran */}
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      const val = parseInt(budgetInput[cat.name] || "0");
                      if (!isNaN(val) && val > 0) {
                        setBudgets({ ...budgets, [cat.name]: val });
                        setBudgetInput({ ...budgetInput, [cat.name]: "" });
                      }
                    }}
                    className="flex items-center gap-1"
                  >
                    <input
                      type="number"
                      min="0"
                      placeholder="Batas"
                      value={budgetInput[cat.name] || ""}
                      onChange={e => setBudgetInput({ ...budgetInput, [cat.name]: e.target.value })}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <button type="submit" className="bg-indigo-500 text-white px-2 py-1 rounded text-xs">Set</button>
                  </form>
                  {budgets[cat.name] && (
                    <span className="text-xs text-indigo-600 ml-2">Batas: {formatRupiah(budgets[cat.name])}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Transaksi Terbaru</h3>
            <Link href="/transactions" className="text-xs text-indigo-600 font-medium hover:text-indigo-700">
              Lihat Semua
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Belum ada transaksi</p>
                <Link href="/transactions" className="text-indigo-600 text-sm mt-2 inline-block">
                  Tambah sekarang
                </Link>
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
          <Link href="/dashboard" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-indigo-600 bg-indigo-50">
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

          <Link href="/ai-chat" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="text-xs font-medium">AI</span>
          </Link>
        </div>
        <div className="h-1 w-32 bg-gray-300 rounded-full mx-auto mb-2"></div>
      </nav>

      <Link
        href="/transactions"
        className="fixed bottom-24 right-4 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center transition-all active:scale-95 z-30"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </Link>
    </div>
  );
}
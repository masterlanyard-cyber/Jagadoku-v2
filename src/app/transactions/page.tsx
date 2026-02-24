"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getTransactions, deleteTransaction, Transaction, exportToCSV, addTransaction } from "@/lib/firestore";
import { parseLocalDate } from "@/lib/date";

const initialCategories = [
  { id: "makanan", name: "Makanan", icon: "🍔", type: "expense" },
  { id: "transportasi", name: "Transportasi", icon: "🚗", type: "expense" },
  { id: "belanja", name: "Belanja", icon: "🛍️", type: "expense" },
  { id: "hiburan", name: "Hiburan", icon: "🎬", type: "expense" },
  { id: "utilitas", name: "Utilitas", icon: "💡", type: "expense" },
  { id: "kesehatan", name: "Kesehatan", icon: "💊", type: "expense" },
  { id: "gaji", name: "Gaji", icon: "💰", type: "income" },
  { id: "bonus", name: "Bonus", icon: "🎁", type: "income" },
  { id: "lainnya", name: "Lainnya", icon: "📦", type: "expense" },
];

const investmentInstruments = [
  "Saham US",
  "Saham ID",
  "Emas",
  "Crypto",
  "Reksa Dana",
  "Obligasi",
  "Deposito",
  "Lainnya",
];

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function TransactionsPage() {
  const { user, loading, needsAuthCode } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [formMode, setFormMode] = useState<"transaction" | "investment">("transaction");
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formInstrument, setFormInstrument] = useState("");
  const [formUsdIdr, setFormUsdIdr] = useState("");
  const getTodayDate = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const [formDate, setFormDate] = useState(getTodayDate());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTransactions = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getTransactions(user.uid);
      setTransactions(data);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user && needsAuthCode) {
      router.push('/auth-code');
    } else if (user) {
      void loadTransactions();
    }
  }, [user, loading, needsAuthCode, router, loadTransactions]);

  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = parseLocalDate(a.date).getTime();
    const dateB = parseLocalDate(b.date).getTime();
    return dateB - dateA;
  });

  const monthOptions = useMemo(() => {
    const uniqueMonths = new Set(
      transactions
        .map(t => t.date.slice(0, 7))
        .filter(value => value.length === 7)
    );

    return Array.from(uniqueMonths).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const monthFilteredTransactions = selectedMonth === "all"
    ? sortedTransactions
    : sortedTransactions.filter(t => t.date.slice(0, 7) === selectedMonth);

  const filteredTransactions = monthFilteredTransactions.filter(t => {
    if (filter === "all") return true;
    return t.type === filter;
  });

  const totalIncome = monthFilteredTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = monthFilteredTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

  const formatMonthLabel = (value: string) => {
    const date = parseLocalDate(`${value}-01`);
    return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm("Yakin mau hapus transaksi ini?")) return;
    try {
      await deleteTransaction(user.uid, id);
      setTransactions((prev) => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Gagal menghapus transaksi");
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert("Silakan login terlebih dahulu");
      return;
    }

    if (formMode === "transaction") {
      if (!formAmount || !formCategory) {
        alert("Jumlah dan kategori harus diisi!");
        return;
      }
    } else {
      if (!formAmount || !formInstrument) {
        alert("Jumlah dan instrumen harus diisi!");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (formMode === "transaction") {
        await addTransaction(user.uid, {
          amount: parseInt(formAmount),
          type: formType,
          category: formCategory,
          description: formDescription,
          date: formDate,
          icon: initialCategories.find(c => c.name === formCategory)?.icon || "📦",
        });
      } else {
        // Investment transaction
        const instrumentDescription = `Instrumen: ${formInstrument}${formUsdIdr ? ` (Kurs: ${formUsdIdr})` : ""}`;
        await addTransaction(user.uid, {
          amount: parseInt(formAmount),
          type: "expense",
          category: "Investasi",
          description: instrumentDescription,
          date: formDate,
          icon: "💼",
        });
      }
      setShowAddModal(false);
      setFormAmount("");
      setFormCategory("");
      setFormDescription("");
      setFormInstrument("");
      setFormUsdIdr("");
      setFormDate(getTodayDate());
      setFormMode("transaction");
      await loadTransactions();
    } catch (error) {
      console.error("Error adding transaction:", error);
      alert("Gagal menambah transaksi");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  if (needsAuthCode) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="font-bold text-gray-900 dark:text-white">Transaksi</h1>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="bg-green-50 dark:bg-green-900 rounded-2xl p-4 border border-green-100 dark:border-green-700">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Total Pemasukan</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatRupiah(totalIncome)}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900 rounded-2xl p-4 border border-red-100 dark:border-red-700">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Total Pengeluaran</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-300">{formatRupiah(totalExpense)}</p>
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Lihat per bulan</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900"
          >
            <option value="all">Semua Bulan</option>
            {monthOptions.map((month) => (
              <option key={month} value={month}>{formatMonthLabel(month)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-4 mb-4 flex items-center justify-end">
        <button
          onClick={() => exportToCSV(filteredTransactions)}
          className="text-sm bg-indigo-600 text-white px-3 py-2 rounded-xl hover:bg-indigo-700"
        >
          Download CSV
        </button>
      </div>

      <div className="px-4 mb-4">
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              filter === "all" ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter("income")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              filter === "income" ? "bg-white dark:bg-gray-900 text-green-600 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            Pemasukan
          </button>
          <button
            onClick={() => setFilter("expense")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              filter === "expense" ? "bg-white dark:bg-gray-900 text-red-600 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            Pengeluaran
          </button>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">📭</span>
            <p className="text-gray-500 dark:text-gray-400">
              Belum ada transaksi
              {selectedMonth !== "all" ? ` untuk ${formatMonthLabel(selectedMonth)}` : ""}
            </p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="inline-block mt-4 text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              Tambah transaksi
            </button>
          </div>
        ) : (
          filteredTransactions.map((t) => (
            <div 
              key={t.id} 
              className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${
                t.type === "income" ? "bg-green-100 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-700"
              }`}>
                {t.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">{t.description}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.category} • {t.date}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-semibold ${
                  t.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}>
                  {t.type === "income" ? "+" : "-"}{formatRupiah(t.amount)}
                </p>
                <button 
                  onClick={() => handleDelete(t.id)}
                  className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 mt-1"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 dark:from-gray-950 to-transparent pointer-events-none" />

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full p-6 relative border border-gray-100 dark:border-gray-700">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" onClick={() => setShowAddModal(false)}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Tambah Transaksi</h2>
            
            {/* Mode Selection */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setFormMode("transaction")}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition ${
                  formMode === "transaction"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                Transaksi
              </button>
              <button
                onClick={() => setFormMode("investment")}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition ${
                  formMode === "investment"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                Investasi
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              {formMode === "transaction" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipe</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as "income" | "expense")}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                    >
                      <option value="expense">Pengeluaran</option>
                      <option value="income">Pemasukan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kategori</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Pilih kategori</option>
                      {initialCategories.filter(c => c.type === formType).map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.icon} {cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jumlah</label>
                    <input
                      type="number"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Deskripsi (opsional)</label>
                    <input
                      type="text"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Catatan"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Instrumen</label>
                    <select
                      value={formInstrument}
                      onChange={(e) => setFormInstrument(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Pilih instrumen</option>
                      {investmentInstruments.map(inst => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jumlah</label>
                    <input
                      type="number"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  {formInstrument.toLowerCase().includes("saham us") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kurs USD/IDR (opsional)</label>
                      <input
                        type="number"
                        value={formUsdIdr}
                        onChange={(e) => setFormUsdIdr(e.target.value)}
                        placeholder="15000"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tanggal</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </button>
            </form>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 pb-safe z-40">
        <div className="flex items-center justify-around px-2 py-2">
          <Link href="/" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Beranda</span>
          </Link>
          
          <Link href="/transactions" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-indigo-600 bg-indigo-50 dark:bg-indigo-900 dark:text-indigo-300">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-xs font-medium">Transaksi</span>
          </Link>

          <button
            onClick={() => setShowAddModal(true)}
            className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center transition-all active:scale-95 -mt-6"
            title="Tambah Transaksi"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          
          <Link href="/budget" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            <span className="text-xs font-medium">Anggaran</span>
          </Link>
          
          <Link href="/investasi" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-medium">Investasi</span>
          </Link>
        </div>
        <div className="h-1 w-32 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-2"></div>
      </nav>
    </div>
  );
}

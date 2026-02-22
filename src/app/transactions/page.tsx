"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getTransactions, deleteTransaction, Transaction } from "@/lib/firestore";
import FloatingActionButton from "@/components/FloatingActionButton";

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

  // Sort transactions by date (newest first) before filtering
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA; // Newest first
  });

  const filteredTransactions = sortedTransactions.filter(t => {
    if (filter === "all") return true;
    return t.type === filter;
  });

  const totalIncome = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

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

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  if (needsAuthCode) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="font-bold text-gray-900">Transaksi</h1>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <p className="text-xs text-green-600 font-medium mb-1">Total Pemasukan</p>
          <p className="text-lg font-bold text-green-700">{formatRupiah(totalIncome)}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
          <p className="text-xs text-red-600 font-medium mb-1">Total Pengeluaran</p>
          <p className="text-lg font-bold text-red-700">{formatRupiah(totalExpense)}</p>
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              filter === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter("income")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              filter === "income" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Pemasukan
          </button>
          <button
            onClick={() => setFilter("expense")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              filter === "expense" ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
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
            <p className="text-gray-500">Belum ada transaksi</p>
            <Link 
              href="/"
              className="inline-block mt-4 text-indigo-600 font-medium hover:text-indigo-700"
            >
              Tambah transaksi
            </Link>
          </div>
        ) : (
          filteredTransactions.map((t) => (
            <div 
              key={t.id} 
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${
                t.type === "income" ? "bg-green-100" : "bg-gray-100"
              }`}>
                {t.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{t.description}</p>
                <p className="text-xs text-gray-500">{t.category} • {t.date}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-semibold ${
                  t.type === "income" ? "text-green-600" : "text-red-600"
                }`}>
                  {t.type === "income" ? "+" : "-"}{formatRupiah(t.amount)}
                </p>
                <button 
                  onClick={() => handleDelete(t.id)}
                  className="text-xs text-gray-400 hover:text-red-500 mt-1"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-40">
        <div className="flex items-center justify-around px-2 py-2">
          <Link href="/" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Beranda</span>
          </Link>
          
          <Link href="/transactions" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-indigo-600 bg-indigo-50">
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

      <FloatingActionButton onAddTransaction={loadTransactions} />
    </div>
  );
}
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import FloatingActionButton from "@/components/FloatingActionButton";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useTransactions } from "@/hooks/useTransactions";
import { useBudgets } from "@/hooks/useBudgets";

// Format rupiah
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

interface BudgetItem {
  category: string;
  icon: string;
  color: string;
  budgetAmount: number;
  spent: number;
}

const defaultBudgets: BudgetItem[] = [
  { category: "Makanan", icon: "🍔", color: "#ef4444", budgetAmount: 0, spent: 0 },
  { category: "Transportasi", icon: "🚗", color: "#3b82f6", budgetAmount: 0, spent: 0 },
  { category: "Belanja", icon: "🛍️", color: "#8b5cf6", budgetAmount: 0, spent: 0 },
  { category: "Hiburan", icon: "🎬", color: "#f59e0b", budgetAmount: 0, spent: 0 },
  { category: "Utilitas", icon: "💡", color: "#10b981", budgetAmount: 0, spent: 0 },
  { category: "Kesehatan", icon: "💊", color: "#ec4899", budgetAmount: 0, spent: 0 },
  { category: "Lainnya", icon: "📦", color: "#6b7280", budgetAmount: 0, spent: 0 },
];

export default function BudgetPage() {
  const router = useRouter();
  const { user, loading, needsAuthCode } = useAuth();
  const { transactions, addTransaction, isLoadingFromFirestore } = useTransactions([]);
  const { budgets, loadingBudgets, setBudget } = useBudgets();
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);
  const [newBudgetAmount, setNewBudgetAmount] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (!loading && user && needsAuthCode) {
      router.push('/auth-code');
    }
  }, [loading, user, needsAuthCode, router]);

  const spentByCategory = useMemo(() => {
    return transactions
      .filter(t => t.type === "expense")
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
  }, [transactions]);

  const budgetItems: BudgetItem[] = defaultBudgets.map(item => ({
    ...item,
    budgetAmount: budgets[item.category] || 0,
    spent: spentByCategory[item.category] || 0,
  }));

  const totalBudget = budgetItems.reduce((sum, b) => sum + b.budgetAmount, 0);
  const totalSpent = budgetItems.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-amber-500";
    return "bg-green-500";
  };

  const getStatusText = (percentage: number) => {
    if (percentage >= 100) return "⚠️ Budget habis!";
    if (percentage >= 90) return "🔴 Hampir habis";
    if (percentage >= 75) return "🟡 Perhatian";
    return "🟢 Aman";
  };

  const handleEditBudget = (budget: BudgetItem) => {
    setEditingBudget(budget);
    setNewBudgetAmount(budget.budgetAmount.toString());
    setShowModal(true);
  };

  const handleSaveBudget = () => {
    if (!editingBudget || !newBudgetAmount) return;
    
    const amount = parseInt(newBudgetAmount.replace(/\D/g, ''));
    if (isNaN(amount) || amount < 0) {
      alert("Nominal tidak valid!");
      return;
    }

    void setBudget(editingBudget.category, amount);
    
    setShowModal(false);
    setEditingBudget(null);
    setNewBudgetAmount("");
  };

  if (loading || loadingBudgets || isLoadingFromFirestore) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  if (!user || needsAuthCode) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 h-14 px-4">
          <Link href="/" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-bold text-gray-900 text-lg">Anggaran</h1>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Overall Summary */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-indigo-100 text-sm mb-1">Total Anggaran Bulan Ini</p>
              <h2 className="text-2xl font-bold">{formatRupiah(totalBudget)}</h2>
            </div>
            <div className="p-2 bg-white/20 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-indigo-100">Terpakai: {formatRupiah(totalSpent)}</span>
              <span className="text-indigo-100">{overallPercentage.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-black/20 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${getStatusColor(overallPercentage)}`}
                style={{ width: `${Math.min(overallPercentage, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-indigo-100">
              Sisa: {formatRupiah(totalRemaining)}
            </span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full bg-white/20`}>
              {getStatusText(overallPercentage)}
            </span>
          </div>
        </div>

        {/* Budget Categories */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Anggaran per Kategori</h3>
          <div className="space-y-3">
            {budgetItems.map((budget) => {
              const percentage = budget.budgetAmount > 0 
                ? (budget.spent / budget.budgetAmount) * 100 
                : 0;
              const isOverBudget = percentage >= 100;
              const isWarning = percentage >= 80;

              return (
                <div 
                  key={budget.category}
                  className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all ${
                    isOverBudget ? "border-red-200 bg-red-50" : 
                    isWarning ? "border-amber-200 bg-amber-50" : 
                    "border-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{ backgroundColor: `${budget.color}20`, color: budget.color }}
                      >
                        {budget.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{budget.category}</h4>
                        <p className="text-xs text-gray-500">
                          {formatRupiah(budget.spent)} / {formatRupiah(budget.budgetAmount)}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleEditBudget(budget)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          percentage >= 100 ? "bg-red-500" :
                          percentage >= 80 ? "bg-amber-500" : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className={`text-xs font-medium ${
                        percentage >= 100 ? "text-red-600" :
                        percentage >= 80 ? "text-amber-600" : "text-green-600"
                      }`}>
                        {percentage.toFixed(0)}% terpakai
                      </span>
                      <span className="text-xs text-gray-500">
                        Sisa: {formatRupiah(Math.max(budget.budgetAmount - budget.spent, 0))}
                      </span>
                    </div>
                  </div>

                  {/* Warning Message */}
                  {percentage >= 100 && (
                    <div className="mt-3 p-2 bg-red-100 rounded-lg flex items-center gap-2">
                      <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-xs text-red-700 font-medium">
                        Budget melebihi batas! Kurangi pengeluaran {budget.category}.
                      </span>
                    </div>
                  )}
                  {percentage >= 80 && percentage < 100 && (
                    <div className="mt-3 p-2 bg-amber-100 rounded-lg flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs text-amber-700 font-medium">
                        Hampir mencapai batas. Waspadai pengeluaran!
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tips Card */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-xl shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">💡 Tips Mengatur Anggaran</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Ikuti aturan 50/30/20: 50% kebutuhan, 30% keinginan, 20% tabungan</li>
                <li>• Review anggaran setiap awal bulan</li>
                <li>• Kurangi kategori yang sering over budget</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Budget Modal */}
      {showModal && editingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Edit Anggaran</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${editingBudget.color}20`, color: editingBudget.color }}
              >
                {editingBudget.icon}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{editingBudget.category}</h4>
                <p className="text-sm text-gray-500">
                  Sudah terpakai: {formatRupiah(editingBudget.spent)}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nominal Anggaran
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                <input
                  type="text"
                  value={newBudgetAmount ? formatRupiah(parseInt(newBudgetAmount.replace(/\D/g, ''))).replace("Rp", "").trim() : ""}
                  onChange={(e) => setNewBudgetAmount(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-lg font-semibold"
                  placeholder="0"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveBudget}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-40">
        <div className="flex items-center justify-around px-2 py-2">
          <Link href="/" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50">
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
          
          <Link href="/budget" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-indigo-600 bg-indigo-50">
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

      <FloatingActionButton onCreateTransaction={addTransaction} />
    </div>
  );
}
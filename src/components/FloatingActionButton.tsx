"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { addTransaction as addTransactionFirestore } from "@/lib/firestore";

type Transaction = {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  date: string;
  icon: string;
};

interface FloatingActionButtonProps {
  onAddTransaction?: () => void;
  onTransactionAdded?: (transaction: Transaction) => void;
}

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

export default function FloatingActionButton({ onAddTransaction, onTransactionAdded }: FloatingActionButtonProps) {
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>("jagadoku-transactions-v2", []);

  const getCategoryIcon = (categoryName: string) => {
    const cat = initialCategories.find(c => c.name === categoryName);
    return cat?.icon || "📦";
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formAmount || !formCategory) {
      alert("Jumlah dan kategori harus diisi!");
      return;
    }

    setIsSubmitting(true);

    try {
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        amount: parseInt(formAmount),
        type: formType,
        category: formCategory,
        description: formDescription,
        date: formDate,
        icon: getCategoryIcon(formCategory),
      };

      // Save to Firestore if user is logged in
      if (user) {
        try {
          const firestoreId = await addTransactionFirestore(user.uid, {
            amount: newTransaction.amount,
            type: newTransaction.type,
            category: newTransaction.category,
            description: newTransaction.description,
            date: newTransaction.date,
            icon: newTransaction.icon,
            note: newTransaction.description,
          });
          newTransaction.id = firestoreId;
        } catch (error) {
          console.error("Error saving to Firestore:", error);
          // Continue with localStorage if Firestore fails
        }
      }

      // Update localStorage
      setTransactions([newTransaction, ...transactions]);
      
      // Reset form
      setFormAmount("");
      setFormCategory("");
      setFormDescription("");
      setFormType("expense");
      setFormDate(new Date().toISOString().split('T')[0]);
      setShowAddModal(false);
      alert("✓ Transaksi berhasil ditambahkan!");
      
      // Callback
      onTransactionAdded?.(newTransaction);
      onAddTransaction?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center transition-all active:scale-95 z-30"
        title="Tambah Transaksi"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Modal untuk menambah transaksi */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowAddModal(false)}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-900">Tambah Transaksi</h2>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              {/* Tipe Transaksi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="income"
                      checked={formType === "income"}
                      onChange={(e) => setFormType(e.target.value as "income" | "expense")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Pemasukan</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="expense"
                      checked={formType === "expense"}
                      onChange={(e) => setFormType(e.target.value as "income" | "expense")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Pengeluaran</span>
                  </label>
                </div>
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Pilih kategori</option>
                  {initialCategories
                    .filter(cat => cat.type === formType)
                    .map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.icon} {cat.name}</option>
                    ))}
                </select>
              </div>

              {/* Jumlah */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah</label>
                <input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Masukkan deskripsi"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Tombol Submit */}
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
    </>
  );
}

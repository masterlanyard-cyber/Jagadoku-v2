'use client';

import { useEffect, useState } from 'react';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
  icon: string;
}

interface ReminderAlertProps {
  transactions: Transaction[];
  dailyLimit?: number;
}

export default function ReminderAlert({ transactions, dailyLimit }: ReminderAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  const todayExpense = transactions
    .filter(t => {
      const tDate = new Date(t.date);
      const today = new Date();
      return t.type === 'expense' && 
             tDate.getDate() === today.getDate() &&
             tDate.getMonth() === today.getMonth() &&
             tDate.getFullYear() === today.getFullYear();
    })
    .reduce((sum, t) => sum + t.amount, 0);

  useEffect(() => {
    setDismissed(false);
  }, [todayExpense]);

  if (dismissed) return null;

  if (!dailyLimit || dailyLimit <= 0) return null;

  const percentage = (todayExpense / dailyLimit) * 100;
  const isOverLimit = todayExpense > dailyLimit;
  const isWarning = todayExpense > dailyLimit * 0.8;

  if (!isWarning) return null;

  return (
    <div className={`rounded-2xl p-4 mb-4 ${
      isOverLimit ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{isOverLimit ? '🚨' : '⚠️'}</span>
          <div>
            <h3 className={`font-semibold text-sm ${isOverLimit ? 'text-red-800' : 'text-amber-800'}`}>
              {isOverLimit ? 'Batas Pengeluaran Harian Terlampaui!' : 'Pengeluaran Hari Ini Tinggi'}
            </h3>
            <p className={`text-xs mt-1 ${isOverLimit ? 'text-red-600' : 'text-amber-700'}`}>
              Anda sudah mengeluarkan <strong>Rp {todayExpense.toLocaleString('id-ID')}</strong> hari ini
              {isOverLimit 
                ? ` (melebihi batas Rp ${dailyLimit.toLocaleString('id-ID')})`
                : ` (${percentage.toFixed(0)}% dari batas)`
              }
            </p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-gray-600 text-lg">
          ×
        </button>
      </div>
      <div className="mt-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${isOverLimit ? 'bg-red-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { parseLocalDate } from '@/lib/date';

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
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  const todayExpense = transactions
    .filter(t => {
      const tDate = parseLocalDate(t.date);
      return t.type === 'expense' && 
             tDate.getDate() === today.getDate() &&
             tDate.getMonth() === today.getMonth() &&
             tDate.getFullYear() === today.getFullYear();
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const currentExpenseKey = `${todayKey}-${todayExpense}`;

  if (dismissedKey === currentExpenseKey) return null;

  if (!dailyLimit || dailyLimit <= 0) return null;

  const percentage = (todayExpense / dailyLimit) * 100;
  const isOverLimit = todayExpense > dailyLimit;
  const isWarning = todayExpense > dailyLimit * 0.8;

  if (!isWarning) return null;

  return (
    <div className={`rounded-2xl p-4 mb-4 ${
      isOverLimit
        ? 'bg-red-50 border border-red-200 dark:bg-red-950/40 dark:border-red-900'
        : 'bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{isOverLimit ? '🚨' : '⚠️'}</span>
          <div>
            <h3 className={`font-semibold text-sm ${isOverLimit ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}>
              {isOverLimit ? 'Batas Pengeluaran Harian Terlampaui!' : 'Pengeluaran Hari Ini Tinggi'}
            </h3>
            <p className={`text-xs mt-1 ${isOverLimit ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
              Anda sudah mengeluarkan <strong>Rp {todayExpense.toLocaleString('id-ID')}</strong> hari ini
              {isOverLimit 
                ? ` (melebihi batas Rp ${dailyLimit.toLocaleString('id-ID')})`
                : ` (${percentage.toFixed(0)}% dari batas)`
              }
            </p>
          </div>
        </div>
        <button onClick={() => setDismissedKey(currentExpenseKey)} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-lg">
          ×
        </button>
      </div>
      <div className="mt-3">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${isOverLimit ? 'bg-red-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
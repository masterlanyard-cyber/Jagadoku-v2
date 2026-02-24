'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { formatDateInputLocal, parseLocalDate } from '@/lib/date';
import { useTheme } from '@/context/ThemeContext';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
  icon: string;
}

interface ChartSectionProps {
  transactions: Transaction[];
}

export default function ChartSection({ transactions }: ChartSectionProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartGrid = isDark ? '#374151' : '#f0f0f0';
  const chartAxis = isDark ? '#9ca3af' : '#9ca3af';
  const tooltipStyle = {
    borderRadius: '8px',
    border: isDark ? '1px solid #374151' : 'none',
    backgroundColor: isDark ? '#111827' : '#ffffff',
    color: isDark ? '#f3f4f6' : '#111827',
    boxShadow: isDark ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  };
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return formatDateInputLocal(date);
    }).reverse();
  }, []);

  const barData = useMemo(() => {
    return last7Days.map(dateStr => {
      const dayTransactions = transactions.filter(t => t.date === dateStr);
      const income = dayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = dayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        name: parseLocalDate(dateStr).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
        Pemasukan: income,
        Pengeluaran: expense,
      };
    });
  }, [transactions, last7Days]);

  const pieData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);

    const categories: Record<string, { amount: number; color: string }> = {
      'Makanan': { amount: 0, color: '#ef4444' },
      'Transportasi': { amount: 0, color: '#3b82f6' },
      'Belanja': { amount: 0, color: '#8b5cf6' },
      'Hiburan': { amount: 0, color: '#f59e0b' },
      'Utilitas': { amount: 0, color: '#10b981' },
      'Lainnya': { amount: 0, color: '#6b7280' },
    };

    expenses.forEach(t => {
      if (categories[t.category]) {
        categories[t.category].amount += t.amount;
      } else {
        categories['Lainnya'].amount += t.amount;
      }
    });

    return Object.entries(categories)
      .filter(([, data]) => data.amount > 0)
      .map(([name, data]) => ({
        name,
        value: data.amount,
        percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
        color: data.color,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Grafik Keuangan</h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">Belum ada data untuk ditampilkan</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">7 Hari Terakhir</h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
              <XAxis dataKey="name" fontSize={10} tickMargin={5} stroke={chartAxis} />
              <YAxis fontSize={10} tickFormatter={(value) => `${value/1000}k`} stroke={chartAxis} />
              <Tooltip 
                formatter={(value: number | undefined) => [
                  value !== undefined ? `Rp ${value.toLocaleString('id-ID')}` : '-',
                  ''
                ]}
                contentStyle={tooltipStyle}
              />
              <Legend wrapperStyle={{ color: isDark ? '#d1d5db' : '#4b5563' }} />
              <Bar dataKey="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {pieData.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Distribusi Kategori</h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                   formatter={(value: number | undefined) => value !== undefined ? `Rp ${value.toLocaleString('id-ID')}` : '-'}
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 justify-center">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.name} ({item.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
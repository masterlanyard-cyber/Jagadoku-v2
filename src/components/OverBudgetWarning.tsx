"use client";

import { useLocalStorage } from "@/hooks/useLocalStorage";

type Transaction = {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  date: string;
  icon: string;
};

interface OverBudgetWarningProps {
  className?: string;
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

export default function OverBudgetWarning({ className = "" }: OverBudgetWarningProps) {
  const [transactions] = useLocalStorage<Transaction[]>("jagadoku-transactions-v2", []);
  const [budgets] = useLocalStorage("jagadoku-budgets", {} as Record<string, number>);

  const getCategoryData = () => {
    const categoryMap = new Map<string, number>();
    
    transactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
      });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => {
        const cat = initialCategories.find(c => c.name === name);
        return {
          name,
          value,
          icon: cat?.icon || "📦",
          percentage: 0,
        };
      })
      .sort((a, b) => b.value - a.value);
  };

  const categoryData = getCategoryData();
  const overBudgetCategories = categoryData.filter(cat => budgets[cat.name] && cat.value > budgets[cat.name]);

  if (overBudgetCategories.length === 0) {
    return null;
  }

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg px-3 py-2 ${className}`}>
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0v2m0-12v2m0-12l-4 4m4-4l4-4" />
        </svg>
        <span className="text-xs font-medium text-red-700">
          {overBudgetCategories.length} kategori over budget
        </span>
      </div>
      {overBudgetCategories.length > 0 && (
        <div className="text-xs text-red-600 mt-1 ml-6">
          {overBudgetCategories.map(cat => cat.name).join(", ")}
        </div>
      )}
    </div>
  );
}

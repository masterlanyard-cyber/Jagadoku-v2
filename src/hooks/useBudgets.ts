import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserBudgets, setUserBudget } from '@/lib/firestore';

type BudgetsMap = Record<string, number>;

const LOCAL_BUDGETS_KEY = 'jagadoku-budgets';

export function useBudgets() {
  const { user } = useAuth();
  const [budgets, setBudgetsState] = useState<BudgetsMap>({});
  const [loadingBudgets, setLoadingBudgets] = useState(true);

  useEffect(() => {
    const loadBudgets = async () => {
      if (user) {
        try {
          setLoadingBudgets(true);
          const data = await getUserBudgets(user.uid);
          setBudgetsState(data);
        } catch (error) {
          console.error('Error loading budgets from Firestore:', error);
          setBudgetsState({});
        } finally {
          setLoadingBudgets(false);
        }
        return;
      }

      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem(LOCAL_BUDGETS_KEY);
          setBudgetsState(saved ? JSON.parse(saved) : {});
        } catch (error) {
          console.error('Error loading budgets from localStorage:', error);
          setBudgetsState({});
        }
      }

      setLoadingBudgets(false);
    };

    loadBudgets();
  }, [user]);

  const setBudget = async (category: string, amount: number) => {
    const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    const nextBudgets = { ...budgets, [category]: safeAmount };
    setBudgetsState(nextBudgets);

    if (user) {
      try {
        await setUserBudget(user.uid, category, safeAmount);
      } catch (error) {
        console.error('Error saving budget to Firestore:', error);
      }
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_BUDGETS_KEY, JSON.stringify(nextBudgets));
      } catch (error) {
        console.error('Error saving budget to localStorage:', error);
      }
    }
  };

  return {
    budgets,
    loadingBudgets,
    setBudget,
  };
}

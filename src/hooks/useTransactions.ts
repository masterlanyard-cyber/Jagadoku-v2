import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { parseLocalDate } from "@/lib/date";
import { 
  addTransaction as addTransactionFirestore, 
  getTransactions as getTransactionsFirestore,
  deleteTransaction as deleteTransactionFirestore
} from "@/lib/firestore";

export interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  date: string;
  icon: string;
}

export function useTransactions(initialData: Transaction[] = []) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>("jagadoku-transactions-v2", initialData);
  const [isLoadingFromFirestore, setIsLoadingFromFirestore] = useState(false);

  // Load transactions from Firestore when user is authenticated
  useEffect(() => {
    if (user) {
      const loadTransactionsFromFirestore = async () => {
        try {
          setIsLoadingFromFirestore(true);
          const firestoreTransactions = await getTransactionsFirestore(user.uid);
          setTransactions(firestoreTransactions);
        } catch (error) {
          console.error("Error loading transactions from Firestore:", error);
        } finally {
          setIsLoadingFromFirestore(false);
        }
      };

      loadTransactionsFromFirestore();
    }
  }, [user, setTransactions]);

  const addTransaction = async (transaction: Omit<Transaction, "id">) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
    };

    if (user) {
      // Save to Firestore if user is logged in
      try {
        const firestoreId = await addTransactionFirestore(user.uid, {
          ...newTransaction,
          date: newTransaction.date,
          note: newTransaction.description,
        });
        newTransaction.id = firestoreId;
      } catch (error) {
        console.error("Error adding transaction to Firestore:", error);
        // Fallback to localStorage if Firestore fails
      }
    }

    // Always update local state with functional update
    setTransactions((prev) => [newTransaction, ...prev]);
  };

  const deleteTransaction = async (transactionId: string) => {
    if (user) {
      try {
        await deleteTransactionFirestore(user.uid, transactionId);
      } catch (error) {
        console.error("Error deleting transaction from Firestore:", error);
      }
    }

    setTransactions((prev) => prev.filter(t => t.id !== transactionId));
  };

  // Helper to sort transactions (newest first)
  const getSortedTransactions = (txns: Transaction[]) => {
    return [...txns].sort((a, b) => {
      const dateA = parseLocalDate(a.date).getTime();
      const dateB = parseLocalDate(b.date).getTime();
      return dateB - dateA; // Newest first
    });
  };

  return {
    transactions: getSortedTransactions(transactions),
    setTransactions,
    addTransaction,
    deleteTransaction,
    isLoadingFromFirestore,
  };
}

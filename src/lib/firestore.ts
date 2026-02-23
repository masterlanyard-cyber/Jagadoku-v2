// src/lib/firestore.ts
import { db } from './firebase';
import { formatDateInputLocal, parseLocalDate } from './date';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  Timestamp,
  where,
  getDoc,
  setDoc
} from 'firebase/firestore';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string;
  note: string;
  type: 'income' | 'expense';
  createdAt?: Date;
  description: string;
  icon: string;
}

export function ensureDb() {
  if (!db) throw new Error('Firestore is not initialized. Make sure NEXT_PUBLIC_FIREBASE_API_KEY is set and code runs in the browser.');
  return db;
}

export const addTransaction = async (userId: string, data: Omit<Transaction, 'id' | 'createdAt'>) => {
  const firestore = ensureDb();
  const transactionsRef = collection(firestore, 'users', userId, 'transactions');
  
  // Parse date string (YYYY-MM-DD) as local date, NOT UTC
  const localDate = parseLocalDate(data.date);
  
  const docRef = await addDoc(transactionsRef, {
    ...data,
    date: Timestamp.fromDate(localDate),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  const firestore = ensureDb();
  const transactionsRef = collection(firestore, 'users', userId, 'transactions');
  // Sort by createdAt descending (newest first) for consistent ordering
  const q = query(transactionsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    amount: doc.data().amount,
    category: doc.data().category,
    date: formatDateInputLocal(doc.data().date.toDate()),
    note: doc.data().note,
    type: doc.data().type,
    createdAt: doc.data().createdAt?.toDate(),
    description: doc.data().description || '',
    icon: doc.data().icon || '',
  }));
};

export const deleteTransaction = async (userId: string, transactionId: string) => {
  const firestore = ensureDb();
  const docRef = doc(firestore, 'users', userId, 'transactions', transactionId);
  await deleteDoc(docRef);
};

export const exportToCSV = (transactions: Transaction[]) => {
  const headers = ['Tanggal', 'Tipe', 'Kategori', 'Jumlah', 'Catatan'];
  const rows = transactions.map(t => [
      parseLocalDate(t.date).toLocaleDateString('id-ID'),
    t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    t.category,
    t.amount,
    t.note || '-'
  ]);
  
  const csv = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
  
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jagadoku-${formatDateInputLocal(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const getTodayExpenses = async (userId: string): Promise<number> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const firestore = ensureDb();
  const transactionsRef = collection(firestore, 'users', userId, 'transactions');
  const q = query(
    transactionsRef,
    where('type', '==', 'expense'),
    where('date', '>=', Timestamp.fromDate(today)),
    where('date', '<', Timestamp.fromDate(tomorrow))
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
};

const userBudgetsDocRef = (userId: string) => doc(ensureDb(), 'users', userId, 'meta', 'budgets');

export const getUserBudgets = async (userId: string): Promise<Record<string, number>> => {
  const snapshot = await getDoc(userBudgetsDocRef(userId));
  if (!snapshot.exists()) {
    return {};
  }

  const data = snapshot.data() as Record<string, unknown>;
  return Object.entries(data).reduce((acc, [key, value]) => {
    if (typeof value === 'number') {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, number>);
};

export const setUserBudget = async (userId: string, category: string, amount: number) => {
  await setDoc(
    userBudgetsDocRef(userId),
    { [category]: amount },
    { merge: true }
  );
};
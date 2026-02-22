// src/lib/firestore.ts
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  Timestamp,
  where
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

export const addTransaction = async (userId: string, data: Omit<Transaction, 'id' | 'createdAt'>) => {
  const transactionsRef = collection(db, 'users', userId, 'transactions');
  const docRef = await addDoc(transactionsRef, {
    ...data,
    date: Timestamp.fromDate(new Date(data.date)),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  const transactionsRef = collection(db, 'users', userId, 'transactions');
  const q = query(transactionsRef, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    amount: doc.data().amount,
    category: doc.data().category,
    date: doc.data().date.toDate().toISOString().split('T')[0],
    note: doc.data().note,
    type: doc.data().type,
    createdAt: doc.data().createdAt?.toDate(),
    description: doc.data().description || '',
    icon: doc.data().icon || '',
  }));
};

export const deleteTransaction = async (userId: string, transactionId: string) => {
  const docRef = doc(db, 'users', userId, 'transactions', transactionId);
  await deleteDoc(docRef);
};

export const exportToCSV = (transactions: Transaction[]) => {
  const headers = ['Tanggal', 'Tipe', 'Kategori', 'Jumlah', 'Catatan'];
  const rows = transactions.map(t => [
      new Date(t.date).toLocaleDateString('id-ID'),
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
  a.download = `jagadoku-${new Date().toISOString().split('T')[0]}.csv`;
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

  const transactionsRef = collection(db, 'users', userId, 'transactions');
  const q = query(
    transactionsRef,
    where('type', '==', 'expense'),
    where('date', '>=', Timestamp.fromDate(today)),
    where('date', '<', Timestamp.fromDate(tomorrow))
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
};
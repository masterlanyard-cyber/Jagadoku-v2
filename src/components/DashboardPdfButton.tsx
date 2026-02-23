"use client";

import React, { useRef } from "react";

export default function DashboardPdfButton({ transactions }: { transactions: any[] }) {
  const ref = useRef<HTMLDivElement | null>(null);

  const formatRupiah = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  const handleDownload = async () => {
    if (!ref.current) return;
    const html2pdf = (await import('html2pdf.js')).default;
    const opt = {
      margin: 12,
      filename: `laporan-jagadoku-${new Date().toISOString().slice(0,10)}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(ref.current).set(opt as any).save();
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <>
      <button onClick={handleDownload} className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded-md hover:bg-gray-900">
        Download PDF
      </button>

      <div style={{ display: 'none' }} ref={ref}>
        <div style={{ fontFamily: 'Inter, Arial, sans-serif', padding: 28, color: '#111827' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <img src="/icons/android-chrome-192x192.png" alt="Jagadoku" style={{ width: 60, height: 60, marginRight: 12 }} />
            <div>
              <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 1 }}>JAGA DOKU</h1>
              <div style={{ color: '#6b7280', fontSize: 12 }}>Manajemen Keuangan Personal</div>
              <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>Jl. Contoh No.1 · Jakarta · Indonesia · support@jagadoku.com</div>
            </div>
          </div>
          <div style={{ height: 1, background: '#e5e7eb', margin: '12px 0 18px' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Laporan Transaksi</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Periode: Semua</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Tanggal Cetak</div>
              <div style={{ fontSize: 13 }}>{new Date().toLocaleDateString('id-ID')}</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>Tanggal</th>
                <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>Tipe</th>
                <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>Kategori</th>
                <th style={{ textAlign: 'right', padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>Jumlah (IDR)</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>{t.date}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>{t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }}>{t.category}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', verticalAlign: 'top' }}>{formatRupiah(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
            <div style={{ textAlign: 'right', fontSize: 12 }}>
              <div style={{ color: '#374151' }}>Total Pemasukan: <strong>{formatRupiah(totalIncome)}</strong></div>
              <div style={{ color: '#374151' }}>Total Pengeluaran: <strong>{formatRupiah(totalExpense)}</strong></div>
              <div style={{ marginTop: 6, fontWeight: 600 }}>Saldo: {formatRupiah(totalIncome - totalExpense)}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

import { NextResponse } from 'next/server';

type ReqBody = {
  message: string;
  transactions?: unknown;
};

function localFallbackReply(message: string, transactions?: any[]): string {
  const lower = message.toLowerCase();

  // basic stats
  const totalExpense = (transactions || []).filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const totalIncome = (transactions || []).filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  if (lower.includes('halo') || lower.includes('hi')) {
    return 'Halo! 👋 Saya asisten finansial lokal. Tanyakan tentang saldo, pengeluaran, atau tips hemat.';
  }

  if (lower.includes('saldo') || lower.includes('total') || lower.includes('uang')) {
    return `Total saldo (perkiraan): Rp ${balance.toLocaleString('id-ID')}. Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}, Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}.`;
  }

  if (lower.includes('pengeluaran') || lower.includes('habis') || lower.includes('keluar')) {
    // find top category
    const byCat: Record<string, number> = {};
    (transactions || []).filter((t: any) => t.type === 'expense').forEach((t: any) => {
      byCat[t.category] = (byCat[t.category] || 0) + (t.amount || 0);
    });
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      return `Pengeluaran terbesar: ${top[0]} — Rp ${top[1].toLocaleString('id-ID')}. Total pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}.`;
    }
    return 'Belum ada data pengeluaran.';
  }

  if (lower.includes('tips') || lower.includes('hemat') || lower.includes('saran')) {
    return 'Tips singkat: kurangi makan di luar, catat pengeluaran, dan tetapkan anggaran bulanan untuk kategori terbesar.';
  }

  return 'Maaf, saya tidak bisa memproses pertanyaan ini secara offline. Coba tanya tentang saldo, pengeluaran, atau tips hemat.';
}

export async function POST(req: Request) {
  try {
    const body: ReqBody = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;

    // If no API key present, return local fallback reply so dev can test without secrets.
    if (!apiKey) {
      const reply = localFallbackReply(body.message, body.transactions as any[]);
      return NextResponse.json({ reply, fallback: true });
    }

    const systemPrompt = `Anda adalah asisten finansial yang membantu pengguna dalam bahasa Indonesia. Jawab singkat, jelas, dan beri insight yang praktis. Jika pengguna meminta simulasi atau rekomendasi, sebutkan asumsi yang digunakan.`;

    const transactionsSnippet = body.transactions
      ? `\n\nUser transactions (JSON): ${JSON.stringify(body.transactions).slice(0, 2000)}`
      : '';

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${body.message}${transactionsSnippet}` },
    ];

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: 'gpt-3.5-turbo', messages, max_tokens: 700 }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: 'OpenAI error', details: text }, { status: 502 });
    }

    const json = await resp.json();
    const reply = json?.choices?.[0]?.message?.content ?? '';

    return NextResponse.json({ reply });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

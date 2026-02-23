import { NextResponse } from 'next/server';

type ReqBody = {
  message: string;
  transactions?: unknown;
};

export async function POST(req: Request) {
  try {
    const body: ReqBody = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY in environment' }, { status: 500 });
    }

    const systemPrompt = `Anda adalah asisten finansial yang membantu pengguna dalam bahasa Indonesia. Jawab singkat, jelas, dan beri insight yang praktis. Jika pengguna meminta simulasi atau rekomendasi, sebutkan asumsi yang digunakan.`;

    // Include a short transactions summary to help the model (if provided)
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

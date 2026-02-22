"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLocalStorage } from "@/hooks/useLocalStorage";

// Format rupiah
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Tipe untuk pesan chat
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  type?: "text" | "insight" | "recommendation";
}

// Tipe untuk transaksi (sama dengan yang di localStorage)
interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  date: string;
  icon: string;
}

// AI Response generator (simulasi AI)
function generateAIResponse(
  userMessage: string,
  transactions: Transaction[]
): { content: string; type: "text" | "insight" | "recommendation" } {
  const lowerMsg = userMessage.toLowerCase();
  
  // Hitung statistik
  const totalExpense = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Kategori pengeluaran terbesar
  const expensesByCategory: Record<string, number> = {};
  transactions
    .filter(t => t.type === "expense")
    .forEach(t => {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    });
  
  const topCategory = Object.entries(expensesByCategory)
    .sort((a, b) => b[1] - a[1])[0];

  // Response berdasarkan pertanyaan
  if (lowerMsg.includes("halo") || lowerMsg.includes("hi") || lowerMsg.includes("hey")) {
    return {
      content: "Halo! 👋 Saya adalah asisten finansial AI Anda. Ada yang bisa saya bantu tentang keuangan Anda hari ini?",
      type: "text"
    };
  }

  if (lowerMsg.includes("saldo") || lowerMsg.includes("total") || lowerMsg.includes("uang")) {
    return {
      content: `💰 Total saldo Anda saat ini adalah **${formatRupiah(balance)}**.\n\n💵 Pemasukan: ${formatRupiah(totalIncome)}\n💸 Pengeluaran: ${formatRupiah(totalExpense)}`,
      type: "insight"
    };
  }

  if (lowerMsg.includes("pengeluaran") || lowerMsg.includes("habis") || lowerMsg.includes("keluar")) {
    if (topCategory) {
      return {
        content: `📊 Pengeluaran terbesar Anda adalah untuk kategori **${topCategory[0]}** sebesar ${formatRupiah(topCategory[1])}.\n\nTotal pengeluaran bulan ini: ${formatRupiah(totalExpense)}`,
        type: "insight"
    };
    }
    return {
      content: "Anda belum memiliki catatan pengeluaran. Mulai tambahkan transaksi untuk melihat analisis!",
      type: "text"
    };
  }

  if (lowerMsg.includes("hemat") || lowerMsg.includes("tips") || lowerMsg.includes("saran") || lowerMsg.includes("nabung")) {
    const tips = [
      "🍱 **Kurangi makan di luar**: Bawa bekal bisa hemat Rp 500.000/bulan!",
      "🚗 **Gunakan transportasi umum**: Gojek/Grab terlalu sering? Coba naik bus/MRT.",
      "☕ **Batasi kopi**: Rp 50.000/hari = Rp 1.5 juta/bulan! Bikin kopi sendiri di rumah.",
      "🛒 **Belanja dengan list**: Hindari impulse buying, buat daftar belanjaan.",
      "📱 **Unsubscribe**: Cek langganan aplikasi yang jarang dipakai."
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    return {
      content: `💡 **Tips Hemat untuk Anda:**\n\n${randomTip}\n\nDengan mengurangi pengeluaran ${topCategory ? topCategory[0] : 'terbesar'} Anda, bisa hemat hingga 20%/bulan!`,
      type: "recommendation"
    };
  }

  if (lowerMsg.includes("investasi")) {
    return {
      content: "📈 **Menu Investasi**\n\n✅ **Simulasi investasi sederhana (imbal hasil 8%/tahun)**\n• Rp 500.000/bulan → 1 thn ≈ Rp 6,2 jt | 3 thn ≈ Rp 19,6 jt | 5 thn ≈ Rp 36,7 jt\n• Rp 1.000.000/bulan → 1 thn ≈ Rp 12,4 jt | 3 thn ≈ Rp 39,2 jt | 5 thn ≈ Rp 73,4 jt\n\n🛟 **Dana darurat (sebelum investasi)**\nDisarankan 3-6x biaya bulanan.\nContoh biaya Rp 3 juta/bulan: target dana darurat Rp 9-18 juta.\n\n🧭 **Profil risiko (ringkas)**\n• Konservatif: fokus keamanan, hasil stabil (RDPU/Deposito)\n• Moderat: gabungan aman & tumbuh (RDPU + RDPT + RD Saham)\n• Agresif: fokus pertumbuhan jangka panjang (RD Saham/Saham)\n\n🏦 **Nama bank (contoh)**\nBCA, BRI, Mandiri, BNI, CIMB Niaga, Danamon.\n\nKetik: \"profil risiko\", \"investasi pemula\", atau \"diversifikasi\" untuk penjelasan lanjut.",
      type: "recommendation"
    };
  }

  if (lowerMsg.includes("profil risiko")) {
    return {
      content: "🧭 **Kuesioner Profil Risiko (singkat)**\nJawab A/B/C untuk setiap pertanyaan:\n\n1) Tujuan investasi?\nA. Jangka pendek (≤ 1 tahun)\nB. Menengah (1-3 tahun)\nC. Panjang (> 3 tahun)\n\n2) Jika nilai investasi turun 10%?\nA. Panik dan tarik dana\nB. Diam dulu, tunggu pulih\nC. Tambah investasi\n\n3) Prioritas Anda?\nA. Keamanan modal\nB. Seimbang\nC. Pertumbuhan maksimal\n\n4) Pengalaman investasi?\nA. Pemula\nB. Pernah mencoba\nC. Sudah rutin\n\n**Skor:** A=1, B=2, C=3.\n• 4-6: Konservatif\n• 7-9: Moderat\n• 10-12: Agresif\n\nKetik jawaban contoh: \"1A 2B 3B 4A\" untuk rekomendasi instrumen.",
      type: "recommendation"
    };
  }

  if (lowerMsg.includes("1a") || lowerMsg.includes("2a") || lowerMsg.includes("3a") || lowerMsg.includes("4a") || lowerMsg.includes("1b") || lowerMsg.includes("2b") || lowerMsg.includes("3b") || lowerMsg.includes("4b") || lowerMsg.includes("1c") || lowerMsg.includes("2c") || lowerMsg.includes("3c") || lowerMsg.includes("4c")) {
    return {
      content: "📌 **Rekomendasi Instrumen (umum)**\n\n• **Konservatif:** RDPU, Deposito, obligasi pemerintah jangka pendek.\n• **Moderat:** RDPU + RDPT + sebagian RD Saham.\n• **Agresif:** RD Saham / saham blue-chip, dengan horizon jangka panjang.\n\nTips: sesuaikan dengan dana darurat & tujuan. Jika ragu, mulai dari konservatif lalu bertahap naikkan risiko.",
      type: "insight"
    };
  }

  if (lowerMsg.includes("analisis") || lowerMsg.includes("analisa") || lowerMsg.includes("review")) {
    const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
    let analysis = "";
    
    if (expenseRatio > 80) {
      analysis = "⚠️ **Perhatian!** Pengeluaran Anda sudah mencapai " + expenseRatio.toFixed(0) + "% dari pemasukan. Segera kurangi pengeluaran non-esensial!";
    } else if (expenseRatio > 50) {
      analysis = "📊 Pengeluaran Anda masih dalam batas wajar (" + expenseRatio.toFixed(0) + "% dari pemasukan). Pertahankan dan coba tingkatkan tabungan.";
    } else {
      analysis = "🌟 **Hebat!** Pengeluaran Anda sangat terkontrol (" + expenseRatio.toFixed(0) + "% dari pemasukan). Terus pertahankan kebiasaan baik ini!";
    }

    return {
      content: `${analysis}\n\n💡 **Rekomendasi:**\nCoba alokasikan minimal 20% pemasukan untuk tabungan dan investasi.`,
      type: "insight"
    };
  }

  if (lowerMsg.includes("terima kasih") || lowerMsg.includes("thanks") || lowerMsg.includes("makasih")) {
    return {
      content: "Sama-sama! 😊 Senang bisa membantu. Jangan rupa untuk kembali bertanya kapan saja. Semoga keuangan Anda semakin sehat! 💪",
      type: "text"
    };
  }

  // Default response
  return {
    content: `Maaf, saya belum paham pertanyaan Anda. 😅\n\nCoba tanyakan tentang:\n• 💰 Saldo/Total uang\n• 📊 Pengeluaran terbesar\n• 💡 Tips hemat/uang\n• 📈 Analisis keuangan\n\nAtau tambahkan transaksi lebih banyak untuk analisis yang lebih akurat!`,
    type: "text"
  };
}

export default function AIChatPage() {
  const [transactions] = useLocalStorage<Transaction[]>("jagadoku-transactions-v2", []);
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>("jagadoku-chat", [
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Halo! Saya asisten finansial AI Anda. Tanyakan apa saja tentang keuangan Anda!\n\nContoh: \"Berapa saldo saya?\", \"Tips hemat uang\", \"Analisis pengeluaran\"",
      timestamp: new Date().toISOString(),
      type: "text"
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll ke bawah
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle kirim pesan
  const handleSend = async (e?: React.FormEvent, quickMessage?: string) => {
    e?.preventDefault();

    const message = (quickMessage ?? inputMessage).trim();
    if (!message) return;

    // Tambah pesan user
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
      type: "text"
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulasi delay AI thinking
    setTimeout(() => {
      const response = generateAIResponse(message, transactions);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content,
        timestamp: new Date().toISOString(),
        type: response.type
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000); // Random delay 1-2 detik
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  // Suggestion buttons
  const suggestions = [
    "Berapa saldo saya?",
    "Pengeluaran terbesar",
    "Tips hemat uang",
    "Analisis keuangan",
    "Menu investasi"
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-indigo-600 text-white sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-3 h-14 px-4">
          <Link href="/" className="p-2 -ml-2 hover:bg-white/20 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="font-semibold">Jagadoku AI</h1>
              <p className="text-xs text-indigo-200 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Online
              </p>
            </div>
          </div>

          <button 
            onClick={() => {
              if (confirm("Hapus semua riwayat chat?")) {
                setMessages([{
                  id: "welcome",
                  role: "assistant",
                  content: "👋 Halo! Saya asisten finansial AI Anda. Tanyakan apa saja tentang keuangan Anda!",
                  timestamp: new Date().toISOString(),
                  type: "text"
                }]);
              }
            }}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Hapus chat"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </header>

      <div className="px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-gray-500">Menu:</span>
          <button
            onClick={() => handleSend(undefined, "Menu investasi")}
            className="whitespace-nowrap px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs rounded-full transition-colors"
          >
            Investasi
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[85%] sm:max-w-[75%] ${message.role === "user" ? "order-2" : "order-1"}`}>
              {/* Bubble */}
              <div
                className={`rounded-2xl px-4 py-3 shadow-sm ${
                  message.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-md"
                    : message.type === "insight"
                    ? "bg-white border-l-4 border-indigo-500 text-gray-800 rounded-bl-md"
                    : message.type === "recommendation"
                    ? "bg-green-50 border-l-4 border-green-500 text-gray-800 rounded-bl-md"
                    : "bg-white text-gray-800 rounded-bl-md"
                }`}
              >
                {/* Format content dengan line break */}
                <div className="text-sm leading-relaxed whitespace-pre-line">
                  {message.content}
                </div>
              </div>
              
              {/* Timestamp */}
              <div className={`text-xs text-gray-400 mt-1 ${
                message.role === "user" ? "text-right" : "text-left"
              }`}>
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length < 3 && (
        <div className="px-4 py-2 bg-white border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Saran pertanyaan:</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputMessage(suggestion);
                }}
                className="whitespace-nowrap px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 pb-safe sticky bottom-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ketik pesan..."
            className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isTyping}
            className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-full flex items-center justify-center transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>

    </div>
  );
}
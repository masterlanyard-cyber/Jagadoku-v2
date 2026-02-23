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

// The AI chat now uses a server-side OpenAI route. The client will POST
// { message, transactions } to `/api/ai/chat` and receive a `{ reply }`.

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

    // Tambah pesan user segera ke UI
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

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, transactions }),
      });

      if (!res.ok) {
        throw new Error(`AI API error: ${res.status}`);
      }

      const data = await res.json();
      const reply = data?.reply || "Maaf, terjadi kesalahan saat memanggil layanan AI.";

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
        type: "text"
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error(err);
      const errMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "Terjadi kesalahan saat memanggil layanan AI. Coba lagi nanti.",
        timestamp: new Date().toISOString(),
        type: "text"
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
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
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTransactions, type Transaction } from "@/hooks/useTransactions";
import { parseLocalDate } from "@/lib/date";
import { useLocalStorage } from "@/hooks/useLocalStorage";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function extractInstrument(description: string): string {
  if (!description) return "Lainnya";
  if (description.startsWith("Instrumen: ")) {
    return description.replace("Instrumen: ", "").trim() || "Lainnya";
  }
  const prefixMatch = description.match(/^([^-]+)\s-\s/);
  if (prefixMatch) {
    return prefixMatch[1].trim() || "Lainnya";
  }
  return "Lainnya";
}

type InstrumentMarketMap = Record<string, number>;
type InstrumentFxMap = Record<string, number>;

type LiveMarketChanges = {
  Crypto: number;
  Emas: number;
  Saham: number;
  SahamUS: number;
};

async function fetchWithCorsProxy(url: string): Promise<string> {
  const proxyUrls = [
    `http://localhost:8787/?url=${encodeURIComponent(url)}`,
    `https://r.jina.ai/http/${url.replace(/^https?:\/\//, "")}`,
    `https://r.jina.ai/http/${url.replace(/^https?:\/\//, "")}?no-cache=1`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];

  let lastError: unknown;

  for (const proxiedUrl of proxyUrls) {
    try {
      const response = await fetch(proxiedUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Proxy failed: ${proxiedUrl}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed fetch: ${url}`);
}

function safeJsonParse<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const start = Math.min(
      ...[text.indexOf("["), text.indexOf("{")].filter((index) => index >= 0)
    );
    const end = Math.max(text.lastIndexOf("]"), text.lastIndexOf("}"));
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as T;
    }
    throw new Error("Failed to parse JSON response");
  }
}

function getChangeFromStooqCsv(csvText: string): number {
  const lines = csvText.trim().split("\n").filter((line) => /^\d{4}-\d{2}-\d{2}/.test(line));
  if (lines.length < 2) return 0;
  const values = lines[1].split(",");
  const open = Number(values[2]);
  const close = Number(values[4]);

  if (!Number.isFinite(open) || !Number.isFinite(close) || open === 0) {
    return 0;
  }

  return ((close - open) / open) * 100;
}

async function fetchLiveMarketChanges(): Promise<LiveMarketChanges> {
  const [cryptoResult, goldResult, stockResult, usStockResult] = await Promise.allSettled([
    (async () => {
      const text = await fetchWithCorsProxy("https://stooq.com/q/l/?s=btcusd&i=d");
      return getChangeFromStooqCsv(text);
    })(),
    (async () => {
      const text = await fetchWithCorsProxy("https://stooq.com/q/l/?s=xauusd&i=d");
      return getChangeFromStooqCsv(text);
    })(),
    (async () => {
      const text = await fetchWithCorsProxy("https://stooq.com/q/l/?s=%5Ejkse&i=d");
      return getChangeFromStooqCsv(text);
    })(),
    (async () => {
      const text = await fetchWithCorsProxy("https://stooq.com/q/l/?s=spy.us&i=d");
      return getChangeFromStooqCsv(text);
    })(),
  ]);

  return {
    Crypto: cryptoResult.status === "fulfilled" ? Number(cryptoResult.value.toFixed(2)) : 0,
    Emas: goldResult.status === "fulfilled" ? Number(goldResult.value.toFixed(2)) : 0,
    Saham: stockResult.status === "fulfilled" ? Number(stockResult.value.toFixed(2)) : 0,
    SahamUS: usStockResult.status === "fulfilled" ? Number(usStockResult.value.toFixed(2)) : 0,
  };
}

async function fetchUsdIdrRate(): Promise<number> {
  try {
    const text = await fetchWithCorsProxy("https://api.exchangerate.host/convert?from=USD&to=IDR");
    const data = safeJsonParse<{ result?: number }>(text);
    if (Number.isFinite(data.result)) {
      // Cache rate to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("jagadoku-usd-idr-cached", String(data.result));
      }
      return Number(data.result);
    }
    return 0;
  } catch (error) {
    console.warn("USD/IDR rate fetch failed:", error);
    // Fallback to cached rate if available
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("jagadoku-usd-idr-cached");
      if (cached) {
        const cachedRate = Number(cached);
        if (Number.isFinite(cachedRate)) {
          console.warn("Using cached USD/IDR rate:", cachedRate);
          return cachedRate;
        }
      }
    }
    return 0;
  }
}

type StooqRow = {
  date: string;
  close: number;
};

function parseStooqCsvHistory(csvText: string): StooqRow[] {
  const lines = csvText.trim().split("\n").filter((line) => /^\d{4}-\d{2}-\d{2}/.test(line));
  if (lines.length < 2) return [];

  return lines.slice(1)
    .map((line) => {
      const values = line.split(",");
      return {
        date: values[0],
        close: Number(values[4]),
      };
    })
    .filter((row) => row.date && Number.isFinite(row.close))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getChangeFromHistory(rows: StooqRow[], isoDate: string): number {
  if (rows.length === 0) return 0;
  const latest = rows[rows.length - 1];
  const base = rows.filter((row) => row.date <= isoDate).pop();
  if (!base || base.close === 0) return 0;
  return ((latest.close - base.close) / base.close) * 100;
}

async function fetchStooqHistory(symbol: string): Promise<StooqRow[]> {
  const text = await fetchWithCorsProxy(`https://stooq.com/q/d/l/?s=${symbol}&i=d`);
  return parseStooqCsvHistory(text);
}

async function fetchUsStockBackdateChange(isoDate: string): Promise<number> {
  const rows = await fetchStooqHistory("spy.us");
  return getChangeFromHistory(rows, isoDate);
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

const investmentInstrumentsConst = [
  "Saham US",
  "Saham ID",
  "Emas",
  "Crypto",
  "Reksa Dana",
  "Obligasi",
  "Deposito",
  "Lainnya",
];

export default function InvestasiPage() {
  const router = useRouter();
  const { user, loading, needsAuthCode } = useAuth();
  const { transactions, addTransaction, deleteTransaction, isLoadingFromFirestore } = useTransactions([]);
  const [marketChanges, setMarketChanges] = useLocalStorage<InstrumentMarketMap>("jagadoku-investment-market-change", {});
  const [marketBaseChanges, setMarketBaseChanges] = useLocalStorage<InstrumentMarketMap>("jagadoku-investment-market-base", {});
  const [usdIdrChanges, setUsdIdrChanges] = useLocalStorage<InstrumentFxMap>("jagadoku-usd-idr-change", {});
  const [currentUsdIdr, setCurrentUsdIdr] = useLocalStorage<number>("jagadoku-usd-idr-current", 0);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketInfo, setMarketInfo] = useState("");
  const [proxyActive, setProxyActive] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [formMode, setFormMode] = useState<"transaction" | "investment">("investment");
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("Investasi");
  const [formDescription, setFormDescription] = useState("");
  const [formInstrument, setFormInstrument] = useState("");
  const [formUsdIdr, setFormUsdIdr] = useState("");

  const getTodayDate = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const [formDate, setFormDate] = useState(getTodayDate());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const investmentInstruments = investmentInstrumentsConst;

  const investmentTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.category === "Investasi"),
    [transactions]
  );

  const totalInvestment = useMemo(
    () => investmentTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
    [investmentTransactions]
  );

  const instrumentSummary = useMemo(() => {
    const grouped = investmentTransactions.reduce((acc, transaction) => {
      const instrument = extractInstrument(transaction.description);
      acc[instrument] = (acc[instrument] || 0) + transaction.amount;
      return acc;
    }, {} as Record<string, number>);
    return grouped;
  }, [investmentTransactions]);

  const instrumentPerformance = useMemo(() => {
    return Object.entries(instrumentSummary).map(([instrument, amount]) => {
      const firstTxn = investmentTransactions
        .filter((txn) => extractInstrument(txn.description) === instrument)
        .sort((a, b) => a.date.localeCompare(b.date))[0];

      const baseChange = marketBaseChanges[instrument] ?? 0;
      const marketChange = marketChanges[instrument] ?? 0;
      const fxChange = usdIdrChanges[instrument] ?? 0;

      return {
        instrument,
        amount,
        baseChange,
        marketChange,
        fxChange,
        firstDate: firstTxn?.date || new Date().toISOString().split("T")[0],
      };
    });
  }, [instrumentSummary, marketBaseChanges, marketChanges, usdIdrChanges, investmentTransactions]);

  const totalPerformanceAmount = useMemo(() => {
    return instrumentPerformance.reduce((sum, item) => {
      const gainLoss = (item.amount * item.marketChange) / 100;
      return sum + gainLoss;
    }, 0);
  }, [instrumentPerformance]);

  const totalPerformancePercent = totalInvestment > 0 ? (totalPerformanceAmount / totalInvestment) * 100 : 0;

  const allocationColors = [
    "#06b6d4",
    "#f59e0b",
    "#10b981",
    "#6366f1",
    "#ef4444",
    "#14b8a6",
    "#f97316",
    "#3b82f6",
  ];

  const mapMarketChangeByInstrument = (instrumentName: string, payload: LiveMarketChanges) => {
    const name = instrumentName.toLowerCase();

    if (name.includes("saham us") || name.includes("us stock") || name.includes("nasdaq") || name.includes("s&p") || name.includes("sp500") || name.includes("usa")) {
      return payload.SahamUS;
    }
    if (name.includes("crypto")) return payload.Crypto;
    if (name.includes("emas")) return payload.Emas;
    if (name.includes("saham")) return payload.Saham;
    if (name.includes("reksa")) return Number((payload.Saham * 0.6).toFixed(2));
    if (name.includes("obligasi")) return Number((payload.Saham * 0.25).toFixed(2));
    if (name.includes("deposito")) return 0.4;
    return 0;
  };

  const isSahamUsInstrument = (name: string) => {
    const lower = name.toLowerCase();
    return lower.includes("saham us") || lower.includes("us stock") || lower.includes("nasdaq") || lower.includes("s&p") || lower.includes("sp500") || lower.includes("usa");
  };

  const isSahamIdInstrument = (name: string) => {
    const lower = name.toLowerCase();
    return lower.includes("saham") && !isSahamUsInstrument(lower);
  };

  const isEmasInstrument = (name: string) => name.toLowerCase().includes("emas");

  const parseUsdIdrFromDescription = (description: string): number | null => {
    const match = description.match(/USDIDR:\s*(\d+(?:\.\d+)?)/i);
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
  };

  const handleUpdateRealtimeMarket = async () => {
    if (instrumentPerformance.length === 0) return;

    setMarketLoading(true);
    setMarketInfo("");

    try {
      const payload = await fetchLiveMarketChanges();
      const latestUsdIdr = await fetchUsdIdrRate();
      if (latestUsdIdr > 0) {
        setCurrentUsdIdr(latestUsdIdr);
      }

      const needsUsHistory = instrumentPerformance.some((item) => isSahamUsInstrument(item.instrument));
      const needsIdHistory = instrumentPerformance.some((item) => isSahamIdInstrument(item.instrument));
      const needsGoldHistory = instrumentPerformance.some((item) => isEmasInstrument(item.instrument));

      const [usHistoryResult, idHistoryResult, goldHistoryResult] = await Promise.allSettled([
        needsUsHistory ? fetchStooqHistory("spy.us") : Promise.resolve<StooqRow[]>([]),
        needsIdHistory ? fetchStooqHistory("^jkse") : Promise.resolve<StooqRow[]>([]),
        needsGoldHistory ? fetchStooqHistory("xauusd") : Promise.resolve<StooqRow[]>([]),
      ]);

      const usHistory = usHistoryResult.status === "fulfilled" ? usHistoryResult.value : [];
      const idHistory = idHistoryResult.status === "fulfilled" ? idHistoryResult.value : [];
      const goldHistory = goldHistoryResult.status === "fulfilled" ? goldHistoryResult.value : [];

      const nextBaseChanges: InstrumentMarketMap = {};
      for (const item of instrumentPerformance) {
        const instrumentName = item.instrument;
        if (isSahamUsInstrument(instrumentName) && usHistory.length > 0) {
          nextBaseChanges[instrumentName] = Number(getChangeFromHistory(usHistory, item.firstDate).toFixed(2));
        } else if (isSahamIdInstrument(instrumentName) && idHistory.length > 0) {
          nextBaseChanges[instrumentName] = Number(getChangeFromHistory(idHistory, item.firstDate).toFixed(2));
        } else if (isEmasInstrument(instrumentName) && goldHistory.length > 0) {
          nextBaseChanges[instrumentName] = Number(getChangeFromHistory(goldHistory, item.firstDate).toFixed(2));
        } else {
          nextBaseChanges[instrumentName] = mapMarketChangeByInstrument(instrumentName, payload);
        }
      }

      setMarketBaseChanges(nextBaseChanges);

      setUsdIdrChanges((prev) => {
        const next = { ...prev };

        for (const item of instrumentPerformance) {
          const name = item.instrument.toLowerCase();
          if (name.includes("saham us") || name.includes("us stock") || name.includes("nasdaq") || name.includes("s&p") || name.includes("sp500") || name.includes("usa")) {
            const description = investmentTransactions.find((txn) => extractInstrument(txn.description) === item.instrument)?.description || "";
            const buyRate = parseUsdIdrFromDescription(description);
            if (buyRate && latestUsdIdr > 0) {
              next[item.instrument] = Number((((latestUsdIdr - buyRate) / buyRate) * 100).toFixed(2));
            } else {
              next[item.instrument] = 0;
            }
          } else {
            next[item.instrument] = 0;
          }
        }

        return next;
      });

      const nextMarketChanges: InstrumentMarketMap = {};
      for (const item of instrumentPerformance) {
        const baseChange = nextBaseChanges[item.instrument] ?? mapMarketChangeByInstrument(item.instrument, payload);
        const name = item.instrument;

        if (isSahamUsInstrument(name)) {
          const description = investmentTransactions.find((txn) => extractInstrument(txn.description) === item.instrument)?.description || "";
          const buyRate = parseUsdIdrFromDescription(description);
          if (buyRate && latestUsdIdr > 0) {
            const fxChange = ((latestUsdIdr - buyRate) / buyRate) * 100;
            const combined = (1 + baseChange / 100) * (1 + fxChange / 100) - 1;
            nextMarketChanges[item.instrument] = Number((combined * 100).toFixed(2));
          } else {
            nextMarketChanges[item.instrument] = baseChange;
          }
        } else {
          nextMarketChanges[item.instrument] = baseChange;
        }
      }

      setMarketChanges(nextMarketChanges);

      const localTime = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const hasUsStock = instrumentPerformance.some((item) => isSahamUsInstrument(item.instrument));
      if (hasUsStock && latestUsdIdr === 0) {
        // Check if we're using cached rate
        if (typeof window !== "undefined") {
          const cached = localStorage.getItem("jagadoku-usd-idr-cached");
          if (cached) {
            const cachedRate = Number(cached);
            if (Number.isFinite(cachedRate)) {
              setMarketInfo(`Realtime update berhasil (${localTime}) • Kurs dari cache (${Math.round(cachedRate)})`);
            } else {
              setMarketInfo(`Realtime update berhasil (${localTime}) • Kurs USD/IDR tidak tersedia`);
            }
          } else {
            setMarketInfo(`Realtime update berhasil (${localTime}) • Kurs USD/IDR tidak tersedia`);
          }
        } else {
          setMarketInfo(`Realtime update berhasil (${localTime}) • Kurs USD/IDR tidak tersedia`);
        }
      } else {
        setMarketInfo(`Realtime update berhasil (${localTime})`);
      }
    } catch (error) {
      console.error("Error updating realtime market data:", error);
      setMarketInfo("Gagal update realtime. Coba lagi.");
    } finally {
      setMarketLoading(false);
    }
  };

  const handleDeleteInvestmentTransaction = async (transactionId: string) => {
    if (!confirm("Hapus transaksi instrumen ini?")) return;
    await deleteTransaction(transactionId);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formMode === "transaction") {
      if (!formAmount || !formCategory) {
        alert("Jumlah dan kategori harus diisi!");
        return;
      }
    } else {
      if (!formAmount || !formInstrument) {
        alert("Jumlah dan instrumen harus diisi!");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (formMode === "transaction") {
        const transactionData: Omit<Transaction, "id"> = {
          amount: parseInt(formAmount),
          type: formType as "income" | "expense",
          category: formCategory,
          description: formDescription,
          date: formDate,
          icon: initialCategories.find(c => c.name === formCategory)?.icon || "📦",
        };
        await addTransaction(transactionData);
      } else {
        // Investment transaction
        let description = `Instrumen: ${formInstrument}`;
        if (formInstrument.toLowerCase().includes("saham us") && formUsdIdr) {
          description += ` - USDIDR: ${formUsdIdr}`;
        }

        const transactionData: Omit<Transaction, "id"> = {
          amount: parseInt(formAmount),
          type: "expense",
          category: "Investasi",
          description: description,
          date: formDate,
          icon: "📈",
        };

        await addTransaction(transactionData);
      }
      
      // Reset form
      setFormAmount("");
      setFormCategory("");
      setFormDescription("");
      setFormInstrument("");
      setFormUsdIdr("");
      setFormDate(getTodayDate());
      setFormMode("investment");
      setShowAddModal(false);
      alert("✓ Transaksi berhasil ditambahkan!");
    } catch (error) {
      console.error("Error adding transaction:", error);
      alert("Gagal menambahkan transaksi");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (!loading && user && needsAuthCode) {
      router.push("/auth-code");
    }
  }, [loading, user, needsAuthCode, router]);

  useEffect(() => {
    let isMounted = true;

    const checkProxy = async () => {
      try {
        const response = await fetch("http://localhost:8787/health", { cache: "no-store" });
        if (!isMounted) return;
        setProxyActive(response.ok);
      } catch {
        if (!isMounted) return;
        setProxyActive(false);
      }
    };

    checkProxy();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || isLoadingFromFirestore) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  const colorMap = (index: number) => allocationColors[index % allocationColors.length];

  return (
    <div className="min-h-screen pb-24 bg-white dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              ←
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Investasi</h1>
          </div>
          <div className="flex items-center gap-2">
            {proxyActive ? (
              <div className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">✓ Proxy</div>
            ) : (
              <div className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">✗ Proxy</div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 bg-white dark:bg-gray-900">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800 rounded-lg p-6 text-white">
          <div className="text-sm opacity-90 mb-2">Total Investasi</div>
          <div className="text-3xl font-bold mb-4">{formatRupiah(totalInvestment)}</div>
          <div className="text-sm opacity-90">
            Performa: <span className={totalPerformancePercent >= 0 ? "text-green-200" : "text-red-200"}>
              {totalPerformancePercent >= 0 ? "+" : ""}{totalPerformancePercent.toFixed(2)}%
            </span> ({formatRupiah(totalPerformanceAmount)})
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Alokasi per Instrumen</h2>
          <div className="space-y-3">
            {instrumentPerformance.map((item, idx) => {
              const percentage = totalInvestment > 0 ? (item.amount / totalInvestment) * 100 : 0;
              return (
                <div key={item.instrument}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.instrument}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatRupiah(item.amount)}</span>
                  </div>
                  <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                    <div
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: colorMap(idx),
                      }}
                      className="h-full flex items-center justify-center text-xs font-semibold text-white"
                    >
                      {percentage > 10 && `${percentage.toFixed(0)}%`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Realtime Update</h2>
            <button
              onClick={handleUpdateRealtimeMarket}
              disabled={marketLoading}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-600 text-white text-xs rounded disabled:opacity-50"
            >
              {marketLoading ? "Loading..." : "Update"}
            </button>
          </div>

          {marketInfo && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded">
              {marketInfo}
            </div>
          )}

          <div className="space-y-2">
            {instrumentPerformance.map((item) => {
              const gainLoss = (item.amount * item.marketChange) / 100;
              const color = item.marketChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

              return (
                <div key={item.instrument} className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">{item.instrument}</span>
                    <span className={`font-semibold ${color}`}>
                      {item.marketChange >= 0 ? "+" : ""}{item.marketChange.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                    <div>Base: {item.baseChange.toFixed(2)}%</div>
                    {isSahamUsInstrument(item.instrument) && <div>FX: {item.fxChange.toFixed(2)}%</div>}
                    <div>Gain/Loss: {formatRupiah(gainLoss)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">History</h2>
          <div className="space-y-2">
            {investmentTransactions
              .slice()
              .reverse()
              .map((txn) => (
                <div key={txn.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white text-sm">{extractInstrument(txn.description)}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{txn.date}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{formatRupiah(txn.amount)}</span>
                    <button
                      onClick={() => handleDeleteInvestmentTransaction(txn.id)}
                      className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 px-2 py-1 rounded text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full p-6 relative border border-gray-100 dark:border-gray-700">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" onClick={() => setShowAddModal(false)}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Tambah Transaksi</h2>
            
            {/* Mode Selection */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setFormMode("transaction")}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition ${
                  formMode === "transaction"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                Transaksi
              </button>
              <button
                onClick={() => setFormMode("investment")}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition ${
                  formMode === "investment"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                Investasi
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              {formMode === "transaction" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipe</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as "income" | "expense")}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                    >
                      <option value="expense">Pengeluaran</option>
                      <option value="income">Pemasukan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kategori</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Pilih kategori</option>
                      {initialCategories.filter(c => c.type === formType).map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.icon} {cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jumlah</label>
                    <input
                      type="number"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Deskripsi (opsional)</label>
                    <input
                      type="text"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Catatan"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Instrumen</label>
                    <select
                      value={formInstrument}
                      onChange={(e) => setFormInstrument(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Pilih instrumen</option>
                      {investmentInstruments.map(inst => (
                        <option key={inst} value={inst}>{inst}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Jumlah</label>
                    <input
                      type="number"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  {formInstrument.toLowerCase().includes("saham us") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kurs USD/IDR (opsional)</label>
                      <input
                        type="number"
                        value={formUsdIdr}
                        onChange={(e) => setFormUsdIdr(e.target.value)}
                        placeholder="15000"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tanggal</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </button>
            </form>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 pb-safe z-40">
        <div className="flex items-center justify-around px-2 py-2">
          <Link href="/" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Beranda</span>
          </Link>
          
          <Link href="/transactions" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-xs font-medium">Transaksi</span>
          </Link>

          <button
            onClick={() => setShowAddModal(true)}
            className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center transition-all active:scale-95 -mt-6"
            title="Tambah Transaksi"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          
          <Link href="/budget" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            <span className="text-xs font-medium">Anggaran</span>
          </Link>
          
          <Link href="/investasi" className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-indigo-600 bg-indigo-50">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-medium">Investasi</span>
          </Link>
        </div>
        <div className="h-1 w-32 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-2"></div>
      </nav>
    </div>
  );
}

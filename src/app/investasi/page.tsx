"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTransactions } from "@/hooks/useTransactions";
import FloatingActionButton from "@/components/FloatingActionButton";
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

      <div className="px-4 py-6 space-y-6">
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

      <FloatingActionButton onCreateTransaction={addTransaction} onAddTransaction={() => {}} />

      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-around text-xs gap-2">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
          <span>📊</span>
          <span>Dashboard</span>
        </Link>
        <Link href="/transactions" className="flex flex-col items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
          <span>📋</span>
          <span>Transaksi</span>
        </Link>
        <Link href="/budget" className="flex flex-col items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
          <span>💰</span>
          <span>Budget</span>
        </Link>
        <Link href="/investasi" className="flex flex-col items-center gap-1 text-blue-500 dark:text-blue-400">
          <span>📈</span>
          <span>Investasi</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
          <span>👤</span>
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}

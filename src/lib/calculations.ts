import type { Trade } from "@/db/schema";

// ── Utility Functions ──
export function num(val: string | number | null | undefined): number {
  if (val == null) return 0;
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? 0 : n;
}

export function round(n: number, decimals = 2): number {
  return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// ── Interfaces ──
export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  expectancy: number;
  avgRiskReward: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  maxDrawdown: number;
  avgHoldingTime: number;
  sharpeRatio: number;
}

// ── Performance Metrics Calculator ──
export function calculatePerformanceMetrics(trades: Trade[]): PerformanceMetrics {
  const closed = trades.filter((t) => t.status === "closed" && !t.isMissed);
  const totalTrades = closed.length;

  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      winRate: 0,
      totalPnl: 0,
      avgWin: 0,
      avgLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      profitFactor: 0,
      expectancy: 0,
      avgRiskReward: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      maxDrawdown: 0,
      avgHoldingTime: 0,
      sharpeRatio: 0,
    };
  }

  const wins = closed.filter((t) => t.outcome === "win");
  const losses = closed.filter((t) => t.outcome === "loss");
  const breakevens = closed.filter((t) => t.outcome === "breakeven");

  const pnls = closed.map((t) => num(t.pnl));
  const winPnls = wins.map((t) => num(t.pnl));
  const lossPnls = losses.map((t) => num(t.pnl));

  const totalPnl = pnls.reduce((a, b) => a + b, 0);
  const totalWinPnl = winPnls.reduce((a, b) => a + b, 0);
  const totalLossPnl = lossPnls.reduce((a, b) => a + b, 0);

  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
  const avgWin = wins.length > 0 ? totalWinPnl / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(totalLossPnl) / losses.length : 0;
  const largestWin = winPnls.length > 0 ? Math.max(...winPnls) : 0;
  const largestLoss = lossPnls.length > 0 ? Math.abs(Math.min(...lossPnls)) : 0;
  const profitFactor =
    totalLossPnl !== 0
      ? Math.abs(totalWinPnl / totalLossPnl)
      : totalWinPnl > 0
      ? Infinity
      : 0;
  const expectancy = totalTrades > 0 ? totalPnl / totalTrades : 0;

  const rrValues = closed
    .map((t) => num(t.riskRewardRatio))
    .filter((r) => r > 0);
  const avgRiskReward =
    rrValues.length > 0
      ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length
      : 0;

  // Consecutive wins/losses
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;
  const sorted = [...closed].sort(
    (a, b) =>
      new Date(a.exitDate || a.entryDate).getTime() -
      new Date(b.exitDate || b.entryDate).getTime()
  );
  for (const t of sorted) {
    if (t.outcome === "win") {
      currentWins++;
      currentLosses = 0;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
    } else if (t.outcome === "loss") {
      currentLosses++;
      currentWins = 0;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
    } else {
      currentWins = 0;
      currentLosses = 0;
    }
  }

  // Max drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 0;
  for (const t of sorted) {
    cumulative += num(t.pnl);
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Avg holding time in hours
  const holdingTimes = closed
    .filter((t) => t.exitDate && t.entryDate)
    .map(
      (t) =>
        (new Date(t.exitDate!).getTime() - new Date(t.entryDate).getTime()) /
        (1000 * 60 * 60)
    );
  const avgHoldingTime =
    holdingTimes.length > 0
      ? holdingTimes.reduce((a, b) => a + b, 0) / holdingTimes.length
      : 0;

  // Sharpe ratio (simplified)
  const avgPnl = totalPnl / totalTrades;
  const variance =
    pnls.reduce((sum, p) => sum + Math.pow(p - avgPnl, 2), 0) / totalTrades;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgPnl / stdDev) * Math.sqrt(252) : 0;

  return {
    totalTrades,
    winningTrades: wins.length,
    losingTrades: losses.length,
    breakevenTrades: breakevens.length,
    winRate: round(winRate),
    totalPnl: round(totalPnl),
    avgWin: round(avgWin),
    avgLoss: round(avgLoss),
    largestWin: round(largestWin),
    largestLoss: round(largestLoss),
    profitFactor: profitFactor === Infinity ? Infinity : round(profitFactor),
    expectancy: round(expectancy),
    avgRiskReward: round(avgRiskReward),
    maxConsecutiveWins,
    maxConsecutiveLosses,
    maxDrawdown: round(maxDrawdown),
    avgHoldingTime: round(avgHoldingTime),
    sharpeRatio: round(sharpeRatio),
  };
}

// ── Equity Curve ──
export function calculateEquityCurve(
  trades: Trade[],
  startingBalance: number
): { date: string; equity: number; pnl: number }[] {
  const sorted = [...trades]
    .filter((t) => t.status === "closed" && !t.isMissed && t.exitDate)
    .sort(
      (a, b) =>
        new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime()
    );

  let equity = startingBalance;
  return sorted.map((t) => {
    const pnl = num(t.pnl);
    equity += pnl;
    return {
      date: new Date(t.exitDate!).toISOString().split("T")[0],
      equity: round(equity),
      pnl: round(pnl),
    };
  });
}

// ── Daily PnL ──
export function calculateDailyPnl(
  trades: Trade[]
): { date: string; pnl: number; trades: number }[] {
  const closed = trades.filter((t) => t.status === "closed" && !t.isMissed && t.exitDate);
  const byDay = new Map<string, { pnl: number; count: number }>();

  for (const t of closed) {
    const day = new Date(t.exitDate!).toISOString().split("T")[0];
    const existing = byDay.get(day) || { pnl: 0, count: 0 };
    existing.pnl += num(t.pnl);
    existing.count++;
    byDay.set(day, existing);
  }

  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => ({
      date,
      pnl: round(data.pnl),
      trades: data.count,
    }));
}

// ── Trades by Market ──
export function getTradesByMarket(
  trades: Trade[]
): Record<string, { count: number; pnl: number; winRate: number }> {
  const result: Record<string, { count: number; pnl: number; wins: number }> = {};
  const closed = trades.filter((t) => t.status === "closed" && !t.isMissed);

  for (const t of closed) {
    const market = t.marketType;
    if (!result[market]) result[market] = { count: 0, pnl: 0, wins: 0 };
    result[market].count++;
    result[market].pnl += num(t.pnl);
    if (t.outcome === "win") result[market].wins++;
  }

  const out: Record<string, { count: number; pnl: number; winRate: number }> = {};
  for (const [k, v] of Object.entries(result)) {
    out[k] = {
      count: v.count,
      pnl: round(v.pnl),
      winRate: v.count > 0 ? round((v.wins / v.count) * 100) : 0,
    };
  }
  return out;
}

// ── Formatting Utilities ──
export function formatCurrency(value: number, currency = "USD"): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  
  try {
    return sign + new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absValue);
  } catch {
    return sign + "$" + absValue.toFixed(2);
  }
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

// ── Price Formatting ──
export function formatPrice(val: string | number | null | undefined): string {
  if (val == null || val === "") return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  // Remove unnecessary trailing zeros but keep at least 1 decimal
  const s = n.toString();
  if (s.includes(".")) {
    // Find last non-zero after decimal
    const [int, dec] = s.split(".");
    const trimmed = dec.replace(/0+$/, "");
    if (trimmed.length === 0) return int + ".0";
    return int + "." + trimmed;
  }
  return s + ".0";
}

// ── Trade Result Display Helpers ──
export function resultLabel(t: { outcome?: string | null; isMissed?: boolean }): string {
  if (t.outcome === "win") return t.isMissed ? "Missed Win" : "Win";
  if (t.outcome === "loss") return t.isMissed ? "Missed Loss" : "Loss";
  if (t.outcome === "breakeven") return t.isMissed ? "Missed BE" : "Breakeven";
  return "—";
}

export function resultVariant(t: { outcome?: string | null; isMissed?: boolean }): "profit" | "loss" | "warn" | "default" {
  if (t.isMissed) return "warn";
  if (t.outcome === "win") return "profit";
  if (t.outcome === "loss") return "loss";
  return "default";
}

// ── Date Utilities (12-hour, AM/PM) ──
// ── Date Utilities (IST, 12-hour AM/PM) ──
const IST_TIMEZONE = "Asia/Kolkata";

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";

  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "—";

  return dt.toLocaleDateString("en-GB", {
    timeZone: IST_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtTime(d: Date | string | null | undefined): string {
  if (!d) return "";

  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";

  return dt.toLocaleTimeString("en-US", {
    timeZone: IST_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";

  const date = fmtDate(d);
  const time = fmtTime(d);

  return date === "—" ? "—" : time ? `${date} · ${time}` : date;
}

export function fmtDateFull(d: Date | string | null | undefined): string {
  if (!d) return "—";

  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "—";

  return dt.toLocaleDateString("en-GB", {
    timeZone: IST_TIMEZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateTimeFull(d: Date | string | null | undefined): string {
  if (!d) return "—";

  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "—";

  const date = dt.toLocaleDateString("en-GB", {
    timeZone: IST_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const time = fmtTime(d);

  return `${date} · ${time}`;
}

"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTrades, useSettings, useCustomOptions, type TradeFilters } from "@/hooks/use-data";
import {
  PageShell,
  Card,
  Button,
  Badge,
  Modal,
  Input,
  Select,
  Textarea,
  EmptyState,
  Tabs,
  Combobox,
  MultiCombobox,
  ImageUpload,
} from "@/components/ui";
import { formatCurrency, formatPrice, num, fmtDate, fmtTime, fmtDateTime, resultLabel, resultVariant } from "@/lib/calculations";
import { exportTradeJournalPDF } from "@/lib/pdf-export";
import { format } from "date-fns";
import type { Trade } from "@/db/schema";

const MARKET_OPTIONS = [
  { value: "forex", label: "Forex" },
  { value: "crypto", label: "Crypto" },
  { value: "commodities", label: "Commodities" },
  { value: "cfd", label: "CFD" },
];

const DIRECTION_OPTIONS = [
  { value: "long", label: "Buy (Long)" },
  { value: "short", label: "Sell (Short)" },
];

const SESSION_OPTIONS = [
  { value: "", label: "Select Session" },
  { value: "pre_market", label: "Pre-Market" },
  { value: "asian", label: "Asian" },
  { value: "sydney", label: "Sydney" },
  { value: "london", label: "London" },
  { value: "overlap", label: "London / New York Overlap" },
  { value: "new_york", label: "New York" },
  { value: "post_market", label: "Post-Market" },
];

const TRADE_TYPE_OPTIONS = [
  { value: "taken", label: "Taken" },
  { value: "missed", label: "Missed" },
];

const RESULT_OPTIONS = [
  { value: "", label: "Select Result" },
  { value: "profit", label: "Profit (Win)" },
  { value: "loss", label: "Loss" },
  { value: "breakeven", label: "Breakeven" },
];

const TIMEFRAME_OPTIONS = [
  { value: "", label: "Select Timeframe" },
  { value: "M1", label: "M1 (1 min)" },
  { value: "M3", label: "M3 (3 min)" },
  { value: "M5", label: "M5 (5 min)" },
  { value: "M15", label: "M15 (15 min)" },
  { value: "M30", label: "M30 (30 min)" },
  { value: "H1", label: "H1 (1 hour)" },
  { value: "H4", label: "H4 (4 hours)" },
  { value: "D1", label: "D1 (Daily)" },
  { value: "W1", label: "W1 (Weekly)" },
];

const WEEKDAY_OPTIONS = [
  { value: "", label: "Any Day" },
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

interface TradeForm {
  symbol: string;
  marketType: string;
  direction: string;
  session: string;
  timeframe: string;
  tradeType: string;
  result: string;
  accountSize: string;
  riskAmount: string;
  riskPercent: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  exitPrice: string;
  positionSize: string;
  pipsCaptured: string;
  pnl: string;
  entryDate: string;
  exitDate: string;
  strategy: string;
  setup: string;
  notes: string;
  whatWorked: string[];
  mistakes: string[];
  whatIDid: string;
  whatIShouldHaveDone: string;
  screenshotBefore: string;
  screenshotAfter: string;
  tags: string;
}

// Strip trailing zeros from numeric strings: "1.08500000" → "1.085", "10000.00" → "10000"
function cleanNum(val: string | null | undefined): string {
  if (!val) return "";
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return String(n);
}

const createDefaultForm = (settings: { startingBalance?: string | null } | null): TradeForm => ({
  symbol: "",
  marketType: "forex",
  direction: "long",
  session: "",
  timeframe: "H1",
  tradeType: "taken",
  result: "",
  accountSize: String(settings?.startingBalance || "10000"),
  riskAmount: "",
  riskPercent: "",
  entryPrice: "",
  stopLoss: "",
  takeProfit: "",
  exitPrice: "",
  positionSize: "",
  pipsCaptured: "",
  pnl: "",
  entryDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  exitDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  strategy: "",
  setup: "",
  notes: "",
  whatWorked: [],
  mistakes: [],
  whatIDid: "",
  whatIShouldHaveDone: "",
  screenshotBefore: "",
  screenshotAfter: "",
  tags: "",
});

export default function TradesPage() {
  const { settings } = useSettings();
  // Filters state - always include accountId from default account
  

  const today = format(new Date(), "yyyy-MM-dd");

const [filters, setFilters] = useState<TradeFilters>(() => {
  if (typeof window !== "undefined") {
    const saved = sessionStorage.getItem("tradeFilters");
    if (saved) return JSON.parse(saved);
  }

  return {
    dateFrom: today,
    dateTo: today,
  };
});

  useEffect(() => {
  sessionStorage.setItem("tradeFilters", JSON.stringify(filters));
}, [filters]);
  const [showFilters, setShowFilters] = useState(false);
  
  const mergedFilters = useMemo(() => ({ ...filters, accountId: settings?.id }), [filters, settings?.id]);
  const { trades, loading, createTrade, updateTrade, deleteTrade, fetchFullTrade } = useTrades(mergedFilters);
  
  // Custom options
  const { options: strategyOptions, createOption: createStrategy, updateOption: updateStrategy, deleteOption: deleteStrategy } = useCustomOptions("strategy");
  const { options: setupOptions, createOption: createSetup, updateOption: updateSetup, deleteOption: deleteSetup } = useCustomOptions("setup");
  const { options: whatWorkedOptions, createOption: createWhatWorked, updateOption: updateWhatWorked, deleteOption: deleteWhatWorked } = useCustomOptions("what_worked");
  const { options: mistakeOptions, createOption: createMistake, updateOption: updateMistake, deleteOption: deleteMistake } = useCustomOptions("mistake");
  const { options: instrumentOptions, createOption: createInstrument, updateOption: updateInstrument, deleteOption: deleteInstrument } = useCustomOptions("instrument");
  
  const [showModal, setShowModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [form, setForm] = useState<TradeForm>(() => createDefaultForm(settings));
  const [saving, setSaving] = useState(false);
  const [minRiskWarning, setMinRiskWarning] = useState("");
  const [tab, setTab] = useState("all");
  const [viewingTrade, setViewingTrade] = useState<Trade | null>(null);
  const [imageModal, setImageModal] = useState<{ url: string; title: string } | null>(null);
  const [viewMode, setViewMode] = useState<"trades" | "report">("trades");
  const [reportRange, setReportRange] = useState({ start: format(new Date(new Date().setDate(new Date().getDate() - 30)), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") });

  // Sync account size from settings
  useEffect(() => {
    if (settings && !editingTrade) {
      setForm((prev) => ({
        ...prev,
        accountSize: String(settings.startingBalance || prev.accountSize),
      }));
    }
  }, [settings, editingTrade]);

  // ── Smart Trading Calculations ──
  //
  // Pip value per standard lot by instrument type:
  //   Forex non-JPY (EUR/USD etc): 1 pip = 0.0001 → $10/pip/lot (lot=100,000 units)
  //   Forex JPY pairs (USD/JPY):   1 pip = 0.01   → ~$6.5-10/pip/lot
  //   Gold XAU/USD:                1 pip = 0.1    → $10/pip/lot  (lot=100 oz)
  //   Crypto BTC/USD:              1 pip = 1.0    → $1/pip/lot   (lot=1 BTC)
  //
  // Core formulas:
  //   SL pips    = |entry - SL| × pipMultiplier
  //   Lot size   = riskAmount / (SL pips × pipValuePerLot)
  //   SL price   = entry ± (riskAmount / (lots × pipValuePerLot)) / pipMultiplier
  //   Pips       = |entry - exit| × pipMultiplier

  const updateField = useCallback((key: keyof TradeForm, value: string | string[]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      const accountSize = num(next.accountSize);
      const entry = num(next.entryPrice);
      const sl = num(next.stopLoss);
      const tp = num(next.takeProfit);
      const exitPrice = num(next.exitPrice);
      const lots = num(next.positionSize);

      // ── 0. Auto-detect market type from symbol ──
      if (key === "symbol") {
        const s = (value as string).toUpperCase();
        if (s.includes("BTC") || s.includes("ETH") || s.includes("SOL") || s.includes("XRP") || s.includes("DOGE") || s.includes("ADA") || s.includes("BNB") || s.includes("MATIC") || s.includes("DOT") || s.includes("AVAX") || s.includes("LINK") || s.includes("LTC")) {
          next.marketType = "crypto";
        } else if (s.includes("XAU") || s.includes("XAG") || s.includes("OIL") || s.includes("WTI") || s.includes("BRENT") || s.includes("NGAS") || s.includes("GOLD") || s.includes("SILVER")) {
          next.marketType = "commodities";
        } else if (s.includes("US30") || s.includes("US500") || s.includes("NAS") || s.includes("DAX") || s.includes("FTSE") || s.includes("SP500") || s.includes("NDX") || s.includes("VIX")) {
          next.marketType = "cfd";
        } else if (s.includes("/") || s.includes("USD") || s.includes("EUR") || s.includes("GBP") || s.includes("JPY") || s.includes("AUD") || s.includes("NZD") || s.includes("CAD") || s.includes("CHF")) {
          next.marketType = "forex";
        }
      }

      // Determine instrument characteristics
      const sym = next.symbol.toUpperCase();
      const isJPY = sym.includes("JPY") && !sym.includes("BTC") && !sym.includes("ETH");
      const isGold = sym.includes("XAU") || sym.includes("GOLD");
      const isCrypto = next.marketType === "crypto";

      // Pip multiplier: how many pips per 1.0 price move
      const pipMultiplier = isCrypto ? 1 : isGold ? 10 : isJPY ? 100 : 10000;
      // Dollar value of 1 pip when trading 1 standard lot
      const pipValuePerLot = isCrypto ? 1 : isGold ? 10 : isJPY ? (1000 / (entry || 150)) * 10 : 10;
      const decimals = isCrypto ? 2 : isGold ? 2 : isJPY ? 3 : 5;

      // ── 1. Risk Amount ↔ Risk % ──
      if (key === "riskPercent" && accountSize > 0) {
        next.riskAmount = ((accountSize * num(value as string)) / 100).toFixed(2);
      } else if (key === "riskAmount" && accountSize > 0) {
        next.riskPercent = ((num(value as string) / accountSize) * 100).toFixed(2);
      } else if (key === "accountSize" && num(next.riskPercent) > 0) {
        next.riskAmount = ((num(value as string) * num(next.riskPercent)) / 100).toFixed(2);
      }

      const riskAmount = num(next.riskAmount);

      // ── 2. Auto-calc Stop Loss from: risk, lots, entry, direction ──
      // Triggered when user enters/changes riskAmount, riskPercent, positionSize, entryPrice, or direction
      const slTriggers: (keyof TradeForm)[] = ["riskAmount", "riskPercent", "positionSize", "entryPrice", "direction"];
      if (slTriggers.includes(key) && key !== "stopLoss" && riskAmount > 0 && lots > 0 && entry > 0) {
        const slPips = riskAmount / (lots * pipValuePerLot);
        const slDistance = slPips / pipMultiplier;
        if (slDistance > 0 && slDistance < entry * 0.5) { // sanity: SL can't be > 50% away
          if (next.direction === "long") {
            next.stopLoss = (entry - slDistance).toFixed(decimals);
          } else {
            next.stopLoss = (entry + slDistance).toFixed(decimals);
          }
        }
      }

      // ── 3. If SL manually changed, auto-calc lot size from: entry, SL, risk ──
      if (key === "stopLoss" && entry > 0 && sl > 0 && riskAmount > 0) {
        const slPips = Math.abs(entry - sl) * pipMultiplier;
        if (slPips > 0) {
          const calcLots = riskAmount / (slPips * pipValuePerLot);

if (calcLots < 0.01) {
  next.positionSize = "0.01";

  const minRiskAmount = slPips * pipValuePerLot * 0.01;
  const minRiskPercent = (minRiskAmount / accountSize) * 100;

  const displayRisk =
  Number.isInteger(minRiskPercent)
    ? minRiskPercent.toString()
    : minRiskPercent.toFixed(1).replace(/\.0$/, "");

setMinRiskWarning(`⚠ Min Risk: ${displayRisk}%`);
} else {
  next.positionSize = calcLots.toFixed(2);
  setMinRiskWarning("");
}
        }
      }

      // ── 4. Result selection → set exit price from SL or TP ──
      if (key === "result") {
        const resultVal = value as string;
        if (resultVal === "loss" && sl > 0) {
          next.exitPrice = next.stopLoss;
        } else if (resultVal === "profit" && tp > 0) {
          next.exitPrice = next.takeProfit;
        } else if (resultVal === "breakeven" && entry > 0) {
          next.exitPrice = next.entryPrice;
        }
        // Recalculate pips from the new exit
        const newExit = num(next.exitPrice);
        if (newExit > 0 && entry > 0) {
          const pips = next.direction === "long" ? (newExit - entry) * pipMultiplier : (entry - newExit) * pipMultiplier;
          next.pipsCaptured = pips.toFixed(1);
        }
      }

      // ── 5. Direction change → recalculate SL and exit pips ──
      if (key === "direction" && entry > 0) {
        // Recalculate exit pips with new direction
        const curExit = num(next.exitPrice);
        if (curExit > 0) {
          const pips = next.direction === "long" ? (curExit - entry) * pipMultiplier : (entry - curExit) * pipMultiplier;
          next.pipsCaptured = pips.toFixed(1);
        }
      }

      // ── 6. Pips from exit price (when exit or entry changes manually) ──
      if ((key === "exitPrice" || key === "entryPrice") && entry > 0 && exitPrice > 0) {
        const pips = next.direction === "long"
          ? (exitPrice - entry) * pipMultiplier
          : (entry - exitPrice) * pipMultiplier;
        next.pipsCaptured = pips.toFixed(1);
      }

      // ── 7. Exit price from pips (when pips entered manually) ──
      if (key === "pipsCaptured" && entry > 0) {
        const pips = num(value as string);
        const newExit = next.direction === "long"
          ? entry + pips / pipMultiplier
          : entry - pips / pipMultiplier;
        next.exitPrice = newExit.toFixed(decimals);
      }

      // ── 8. Auto-calc P&L ──
      const finalExit = num(next.exitPrice);
      const finalLots = num(next.positionSize);
      if (finalExit > 0 && entry > 0 && finalLots > 0) {
        const rawPips = next.direction === "long" ? (finalExit - entry) * pipMultiplier : (entry - finalExit) * pipMultiplier;
        next.pnl = (rawPips * pipValuePerLot * finalLots).toFixed(2);
      } else if (num(next.pipsCaptured) !== 0 && finalLots > 0) {
        next.pnl = (num(next.pipsCaptured) * pipValuePerLot * finalLots).toFixed(2);
      }

      return next;
    });
  }, []);

  const openModal = useCallback((trade?: Trade) => {
    if (trade) {
      setEditingTrade(trade);
      setForm({
        symbol: trade.symbol,
        marketType: trade.marketType,
        direction: trade.direction,
        session: trade.session || "",
        timeframe: trade.timeframe || "H1",
        tradeType: trade.isMissed ? "missed" : "taken",
        result: trade.outcome === "win" ? "profit" : trade.outcome === "loss" ? "loss" : trade.outcome === "breakeven" ? "breakeven" : "",
        accountSize: cleanNum(trade.accountSize) || cleanNum(settings?.startingBalance) || "10000",
        riskAmount: cleanNum(trade.riskAmount),
        riskPercent: cleanNum(trade.riskPercent),
        entryPrice: cleanNum(trade.entryPrice),
        stopLoss: cleanNum(trade.stopLoss),
        takeProfit: cleanNum(trade.takeProfit),
        exitPrice: cleanNum(trade.exitPrice),
        positionSize: cleanNum(trade.positionSize),
        pipsCaptured: cleanNum(trade.pipsCaptured),
        pnl: cleanNum(trade.pnl),
        entryDate: format(new Date(trade.entryDate), "yyyy-MM-dd'T'HH:mm"),
        exitDate: trade.exitDate ? format(new Date(trade.exitDate), "yyyy-MM-dd'T'HH:mm") : "",
        strategy: trade.strategy || "",
        setup: trade.setup || "",
        notes: trade.notes || "",
        whatWorked: (trade.whatWorked as string[]) || [],
        mistakes: (trade.mistakes as string[]) || [],
        whatIDid: trade.whatIDid || "",
        whatIShouldHaveDone: trade.whatIShouldHaveDone || "",
        screenshotBefore: trade.screenshotBefore || "",
        screenshotAfter: trade.screenshotAfter || "",
        tags: (trade.tags as string[])?.join(", ") || "",
      });
    } else {
      setEditingTrade(null);
      setForm(createDefaultForm(settings));
    }
    setShowModal(true);
  }, [settings]);

  const handleSubmit = async () => {
    if (!form.symbol || !form.entryPrice || !form.positionSize) return;
    setSaving(true);
    try {
      // Map result to outcome for API
      const outcomeMap: Record<string, string> = { profit: "win", loss: "loss", breakeven: "breakeven" };
      const isMissed = form.tradeType === "missed";
      const payload = {
        ...form,
        status: "closed",
        fees: "0",
        outcome: outcomeMap[form.result] || null,
        isMissed,
        accountId: settings?.id || null,
        session: form.session || null,
        exitPrice: form.exitPrice || null,
        stopLoss: form.stopLoss || null,
        takeProfit: form.takeProfit || null,
        exitDate: form.exitDate || null,
        pnl: form.pnl || null,
        pipsCaptured: form.pipsCaptured || null,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        whatWorked: form.whatWorked,
        mistakes: form.mistakes,
      };
      if (editingTrade) {
        await updateTrade({ id: editingTrade.id, ...payload });
      } else {
        await createTrade(payload);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this trade?")) {
      await deleteTrade(id);
    }
  };

  const filteredByTab = useMemo(() => {
    const taken = trades.filter((t) => !t.isMissed);
    const missed = trades.filter((t) => t.isMissed);
    if (tab === "all") return taken;
    if (tab === "win") return taken.filter((t) => t.outcome === "win");
    if (tab === "loss") return taken.filter((t) => t.outcome === "loss");
    if (tab === "breakeven") return taken.filter((t) => t.outcome === "breakeven");
    if (tab === "missed_all") return missed;
    if (tab === "missed_win") return missed.filter((t) => t.outcome === "win");
    if (tab === "missed_loss") return missed.filter((t) => t.outcome === "loss");
    return taken;
  }, [trades, tab]);

  const stats = useMemo(() => {
    const taken = trades.filter((t) => !t.isMissed);
    const missed = trades.filter((t) => t.isMissed);
    const wins = taken.filter((t) => t.outcome === "win");
    const totalPnl = taken.reduce((sum, t) => sum + num(t.pnl), 0);
    return {
      total: taken.length,
      missed: missed.length,
      missedWins: missed.filter((t) => t.outcome === "win").length,
      missedLosses: missed.filter((t) => t.outcome === "loss").length,
      winRate: taken.length > 0 ? (wins.length / taken.length) * 100 : 0,
      totalPnl,
    };
  }, [trades]);

  return (
    <PageShell
      title="Trade Journal"
      subtitle={`${stats.total} trades · ${stats.winRate.toFixed(1)}% win rate · ${formatCurrency(stats.totalPnl)}`}
      actions={
        <>
          <Button variant="secondary" onClick={() => setShowFilters(!showFilters)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
            Filters
            {Object.values(filters).filter(Boolean).length > 0 && (
              <Badge variant="accent" size="sm">{Object.values(filters).filter(Boolean).length}</Badge>
            )}
          </Button>
          <Button onClick={() => openModal()}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Log Trade
          </Button>
        </>
      }
    >
      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card className="animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Input
              label="From Date"
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            />
            <Input
              label="To Date"
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            />
            <Input
              label="Instrument"
              placeholder="EUR/USD..."
              value={filters.symbol || ""}
              onChange={(e) => setFilters((f) => ({ ...f, symbol: e.target.value }))}
            />
            <Select
              label="Strategy"
              value={filters.strategy || ""}
              onChange={(e) => setFilters((f) => ({ ...f, strategy: e.target.value }))}
              options={[{ value: "", label: "All Strategies" }, ...strategyOptions.map((s) => ({ value: s.value, label: s.value }))]}
            />
            <Select
              label="Setup"
              value={filters.setup || ""}
              onChange={(e) => setFilters((f) => ({ ...f, setup: e.target.value }))}
              options={[{ value: "", label: "All Setups" }, ...setupOptions.map((s) => ({ value: s.value, label: s.value }))]}
            />
            <Select
              label="Session"
              value={filters.session || ""}
              onChange={(e) => setFilters((f) => ({ ...f, session: e.target.value }))}
              options={[{ value: "", label: "All Sessions" }, ...SESSION_OPTIONS.slice(1)]}
            />
            <Select
              label="Timeframe"
              value={filters.timeframe || ""}
              onChange={(e) => setFilters((f) => ({ ...f, timeframe: e.target.value }))}
              options={[{ value: "", label: "All Timeframes" }, ...TIMEFRAME_OPTIONS.slice(1)]}
            />
            <Select
              label="Result"
              value={filters.outcome || ""}
              onChange={(e) => setFilters((f) => ({ ...f, outcome: e.target.value }))}
              options={[
                { value: "", label: "All Results" },
                { value: "win", label: "Win" },
                { value: "loss", label: "Loss" },
                { value: "breakeven", label: "Breakeven" },
              ]}
            />
            <Select
              label="Direction"
              value={filters.direction || ""}
              onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value }))}
              options={[
                { value: "", label: "All Directions" },
                { value: "long", label: "Long (Buy)" },
                { value: "short", label: "Short (Sell)" },
              ]}
            />
            <Select
              label="Weekday"
              value={filters.weekday || ""}
              onChange={(e) => setFilters((f) => ({ ...f, weekday: e.target.value }))}
              options={WEEKDAY_OPTIONS}
            />
            <Input
              label="Search"
              placeholder="Symbol, strategy, notes..."
              value={filters.search || ""}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={() => setFilters({})}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* View Mode + Quick Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Tabs
            tabs={[
              { value: "trades", label: "Trade List" },
              { value: "report", label: "Tabular Report" },
            ]}
            active={viewMode}
            onChange={(v) => setViewMode(v as "trades" | "report")}
          />
          {viewMode === "trades" && (
            <Tabs
              tabs={[
                { value: "all", label: `All (${stats.total})` },
                { value: "win", label: "Wins" },
                { value: "loss", label: "Losses" },
                { value: "breakeven", label: "BE" },
                { value: "missed_all", label: `Missed (${stats.missed})` },
                { value: "missed_win", label: "Missed Wins" },
                { value: "missed_loss", label: "Missed Losses" },
              ]}
              active={tab}
              onChange={setTab}
            />
          )}
        </div>
      </div>

      {/* Tabular Report View */}
      {viewMode === "report" && (
        <TabularReport
          trades={trades}
          reportRange={reportRange}
          setReportRange={setReportRange}
        />
      )}

      {/* Trades Grid/Table */}
      {viewMode === "trades" && loading ? (
        <Card>
          <div className="h-40 animate-pulse bg-dark-700 rounded" />
        </Card>
      ) : viewMode === "trades" && filteredByTab.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75Z" />
              </svg>
            }
            title="No trades found"
            description="Start logging your trades to track performance."
            action={<Button onClick={() => openModal()}>Log Your First Trade</Button>}
          />
        </Card>
      ) : viewMode === "trades" ? (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {["Date", "Instrument", "Direction", "Entry", "Exit", "Pips", "P&L", "R", "Strategy", "Result", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredByTab.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                    onClick={async () => {
                      // Show immediately with slim data, then load screenshots
                      setViewingTrade(t);
                      if (!t.screenshotBefore && !t.screenshotAfter) {
                        const full = await fetchFullTrade(t.id);
                        if (full) setViewingTrade(full);
                    }
                    }}
                  >
                    <td className="px-4 py-3 text-dark-200 whitespace-nowrap">
                      {fmtDateTime(t.entryDate)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{t.symbol}</td>
                    <td className="px-4 py-3">
                      <Badge variant={t.direction === "long" ? "profit" : "loss"}>
                        {t.direction === "long" ? "BUY" : "SELL"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-dark-200 font-mono text-xs">{formatPrice(t.entryPrice)}</td>
                    <td className="px-4 py-3 text-dark-200 font-mono text-xs">{formatPrice(t.exitPrice)}</td>
                    <td className="px-4 py-3">
                      {t.pipsCaptured ? (
                        <span className={num(t.pipsCaptured) >= 0 ? "text-profit" : "text-loss"}>
                          {num(t.pipsCaptured) >= 0 ? "+" : ""}{num(t.pipsCaptured).toFixed(1)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {t.pnl ? (
                        <span className={`font-semibold ${num(t.pnl) >= 0 ? "text-profit" : "text-loss"}`}>
                          {formatCurrency(num(t.pnl))}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {t.rMultiple ? (
                        <span className={num(t.rMultiple) >= 0 ? "text-profit" : "text-loss"}>
                          {num(t.rMultiple) >= 0 ? "+" : ""}{num(t.rMultiple).toFixed(2)}R
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-dark-300 text-xs">{t.strategy || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={resultVariant(t)}>{resultLabel(t)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); openModal(t); }}
                          className="p-1 rounded hover:bg-white/10 text-dark-400 hover:text-white"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                          className="p-1 rounded hover:bg-loss/10 text-dark-400 hover:text-loss"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {/* Trade Form Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingTrade ? "Edit Trade" : "Log New Trade"} wide>
        <div className="space-y-6">
          {/* Row 1: Core Trade Info */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Combobox
              label="Instrument"
              value={form.symbol}
              onChange={(v) => updateField("symbol", v)}
              options={instrumentOptions}
              onCreateNew={async (v) => { await createInstrument({ type: "instrument", value: v.toUpperCase() }); }}
              onEdit={async (id, v) => { await updateInstrument({ id, value: v.toUpperCase() }); }}
              onDelete={async (id) => { await deleteInstrument(id); }}
              placeholder="EUR/USD, BTC/USD..."
            />
            <Select
              label="Direction"
              value={form.direction}
              onChange={(e) => updateField("direction", e.target.value)}
              options={DIRECTION_OPTIONS}
            />
            <Select
              label="Taken / Missed"
              value={form.tradeType}
              onChange={(e) => updateField("tradeType", e.target.value)}
              options={TRADE_TYPE_OPTIONS}
            />
            <Select
              label="Market"
              value={form.marketType}
              onChange={(e) => updateField("marketType", e.target.value)}
              options={MARKET_OPTIONS}
            />
          </div>

          {/* Row 2: Risk Management */}
          <div className="p-4 bg-dark-800/50 rounded-lg border border-white/5">
            <h4 className="text-xs font-medium text-dark-300 uppercase tracking-wider mb-3">Risk Management</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="Account Size"
                type="number"
                value={form.accountSize}
                onChange={(e) => updateField("accountSize", e.target.value)}
                suffix="$"
              />
              <Input
                label="Risk %"
                type="number"
                step="0.1"
                value={form.riskPercent}
                onChange={(e) => updateField("riskPercent", e.target.value)}
                suffix="%"
              />
              <Input
                label="Risk Amount"
                type="number"
                step="0.01"
                value={form.riskAmount}
                onChange={(e) => updateField("riskAmount", e.target.value)}
                suffix="$"
              />
              <Input
                label="Position Size"
                type="number"
                step="0.01"
                value={form.positionSize}
                onChange={(e) => updateField("positionSize", e.target.value)}
                suffix="lots"
              />

              {minRiskWarning && (
  <p className="mt-1 text-xs text-yellow-400">
    {minRiskWarning}
  </p>
)}
            </div>
          </div>

          {/* Row 3: Prices */}
          <div className="p-4 bg-dark-800/50 rounded-lg border border-white/5">
            <h4 className="text-xs font-medium text-dark-300 uppercase tracking-wider mb-3">Prices</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input label="Entry Price" type="number" step="any" value={form.entryPrice} onChange={(e) => updateField("entryPrice", e.target.value)} />
              <Input label="Stop Loss" type="number" step="any" value={form.stopLoss} onChange={(e) => updateField("stopLoss", e.target.value)} />
              <Input label="Take Profit" type="number" step="any" value={form.takeProfit} onChange={(e) => updateField("takeProfit", e.target.value)} />
              <Input label="Exit Price" type="number" step="any" value={form.exitPrice} onChange={(e) => updateField("exitPrice", e.target.value)} />
            </div>
          </div>

          {/* Row 3b: Result & P/L */}
          <div className="p-4 bg-dark-800/50 rounded-lg border border-white/5">
            <h4 className="text-xs font-medium text-dark-300 uppercase tracking-wider mb-3">Result</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Select label="Profit / Loss" value={form.result} onChange={(e) => updateField("result", e.target.value)} options={RESULT_OPTIONS} />
              <Input label="Pips Captured" type="number" step="0.1" value={form.pipsCaptured} onChange={(e) => updateField("pipsCaptured", e.target.value)} />
              <Input label="P/L" type="number" step="0.01" value={form.pnl} onChange={(e) => updateField("pnl", e.target.value)} suffix="$" />
            </div>
          </div>

          {/* Row 4: Strategy & Context */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Combobox
              label="Strategy"
              value={form.strategy}
              onChange={(v) => updateField("strategy", v)}
              options={strategyOptions}
              onCreateNew={async (v) => { await createStrategy({ type: "strategy", value: v }); }}
              onEdit={async (id, v) => { await updateStrategy({ id, value: v }); }}
              onDelete={async (id) => { await deleteStrategy(id); }}
              placeholder="Breakout, Mean Reversion..."
            />
            <Combobox
              label="Setup"
              value={form.setup}
              onChange={(v) => updateField("setup", v)}
              options={setupOptions}
              onCreateNew={async (v) => { await createSetup({ type: "setup", value: v }); }}
              onEdit={async (id, v) => { await updateSetup({ id, value: v }); }}
              onDelete={async (id) => { await deleteSetup(id); }}
              placeholder="Double bottom, Fib retrace..."
            />
            <Select
              label="Session"
              value={form.session}
              onChange={(e) => updateField("session", e.target.value)}
              options={SESSION_OPTIONS}
            />
            <Select
              label="Timeframe"
              value={form.timeframe}
              onChange={(e) => updateField("timeframe", e.target.value)}
              options={TIMEFRAME_OPTIONS}
            />
          </div>

          {/* Row 5: Timing */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Entry Date"
              type="datetime-local"
              value={form.entryDate}
              onChange={(e) => updateField("entryDate", e.target.value)}
            />
            <Input
              label="Exit Date"
              type="datetime-local"
              value={form.exitDate}
              onChange={(e) => updateField("exitDate", e.target.value)}
            />
          </div>

          {/* Row 6: Screenshots */}
          <div className="grid grid-cols-2 gap-4">
            <ImageUpload
              label="Screenshot Before"
              value={form.screenshotBefore}
              onChange={(v) => updateField("screenshotBefore", v)}
              onRemove={() => updateField("screenshotBefore", "")}
            />
            <ImageUpload
              label="Screenshot After"
              value={form.screenshotAfter}
              onChange={(v) => updateField("screenshotAfter", v)}
              onRemove={() => updateField("screenshotAfter", "")}
            />
          </div>

          {/* Row 7: What Worked & Mistakes */}
          <div className="grid grid-cols-2 gap-4">
            <MultiCombobox
              label="What Worked"
              values={form.whatWorked}
              onChange={(v) => updateField("whatWorked", v)}
              options={whatWorkedOptions}
              onCreateNew={async (v) => { await createWhatWorked({ type: "what_worked", value: v }); }}
              onEdit={async (id, v) => { await updateWhatWorked({ id, value: v }); }}
              onDelete={async (id) => { await deleteWhatWorked(id); }}
            />
            <MultiCombobox
              label="Mistakes"
              values={form.mistakes}
              onChange={(v) => updateField("mistakes", v)}
              options={mistakeOptions}
              onCreateNew={async (v) => { await createMistake({ type: "mistake", value: v }); }}
              onEdit={async (id, v) => { await updateMistake({ id, value: v }); }}
              onDelete={async (id) => { await deleteMistake(id); }}
            />
          </div>

          {/* Row 8: Reflection */}
          <div className="grid grid-cols-2 gap-4">
            <Textarea
              label="What I Did"
              value={form.whatIDid}
              onChange={(e) => updateField("whatIDid", e.target.value)}
              placeholder="Describe your actions..."
            />
            <Textarea
              label="What I Should Have Done"
              value={form.whatIShouldHaveDone}
              onChange={(e) => updateField("whatIShouldHaveDone", e.target.value)}
              placeholder="Ideal behavior..."
            />
          </div>

          {/* Row 9: Notes & Tags */}
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="Additional observations..."
          />
          <Input
            label="Tags (comma separated)"
            value={form.tags}
            onChange={(e) => updateField("tags", e.target.value)}
            placeholder="trend, high-probability, news..."
          />
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/5">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.symbol || !form.entryPrice}>
            {saving ? "Saving..." : editingTrade ? "Update Trade" : "Log Trade"}
          </Button>
        </div>
      </Modal>

      {/* Trade Detail View Modal */}
      <Modal open={!!viewingTrade} onClose={() => setViewingTrade(null)} title="Trade Details" wide>
        {viewingTrade && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-white">{viewingTrade.symbol}</span>
                <Badge variant={viewingTrade.direction === "long" ? "profit" : "loss"}>
                  {viewingTrade.direction === "long" ? "BUY" : "SELL"}
                </Badge>
                <Badge variant={resultVariant(viewingTrade)}>
                  {resultLabel(viewingTrade)}
                </Badge>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${num(viewingTrade.pnl) >= 0 ? "text-profit" : "text-loss"}`}>
                  {formatCurrency(num(viewingTrade.pnl))}
                </p>
                {viewingTrade.rMultiple && (
                  <p className={`text-sm ${num(viewingTrade.rMultiple) >= 0 ? "text-profit" : "text-loss"}`}>
                    {num(viewingTrade.rMultiple) >= 0 ? "+" : ""}{num(viewingTrade.rMultiple).toFixed(2)}R
                  </p>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-dark-800 rounded-lg p-3">
                <p className="text-xs text-dark-400 uppercase">Entry</p>
                <p className="text-lg font-mono text-white">{formatPrice(viewingTrade.entryPrice)}</p>
              </div>
              <div className="bg-dark-800 rounded-lg p-3">
                <p className="text-xs text-dark-400 uppercase">Exit</p>
                <p className="text-lg font-mono text-white">{formatPrice(viewingTrade.exitPrice)}</p>
              </div>
              <div className="bg-dark-800 rounded-lg p-3">
                <p className="text-xs text-dark-400 uppercase">Pips</p>
                <p className={`text-lg font-mono ${num(viewingTrade.pipsCaptured) >= 0 ? "text-profit" : "text-loss"}`}>
                  {viewingTrade.pipsCaptured ? `${num(viewingTrade.pipsCaptured) >= 0 ? "+" : ""}${viewingTrade.pipsCaptured}` : "—"}
                </p>
              </div>
              <div className="bg-dark-800 rounded-lg p-3">
                <p className="text-xs text-dark-400 uppercase">Risk:Reward</p>
                <p className="text-lg font-mono text-white">{viewingTrade.riskRewardRatio || "—"}</p>
              </div>
            </div>

            {/* Screenshots */}
            {(viewingTrade.screenshotBefore || viewingTrade.screenshotAfter) && (
              <div className="grid grid-cols-2 gap-4">
                {viewingTrade.screenshotBefore && (
                  <div>
                    <p className="text-xs text-dark-400 uppercase mb-2">Before</p>
                    <img loading="lazy"
                      src={viewingTrade.screenshotBefore}
                      alt="Before"
                      className="w-full rounded-lg border border-white/10 cursor-pointer hover:border-accent-500/50 transition-colors"
                      onClick={() => setImageModal({ url: viewingTrade.screenshotBefore!, title: `${viewingTrade.symbol} — Before Entry` })}
                    />
                  </div>
                )}
                {viewingTrade.screenshotAfter && (
                  <div>
                    <p className="text-xs text-dark-400 uppercase mb-2">After</p>
                    <img loading="lazy"
                      src={viewingTrade.screenshotAfter}
                      alt="After"
                      className="w-full rounded-lg border border-white/10 cursor-pointer hover:border-accent-500/50 transition-colors"
                      onClick={() => setImageModal({ url: viewingTrade.screenshotAfter!, title: `${viewingTrade.symbol} — After Exit` })}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Meta */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {viewingTrade.strategy && (
                <div><span className="text-dark-400">Strategy:</span> <span className="text-white">{viewingTrade.strategy}</span></div>
              )}
              {viewingTrade.setup && (
                <div><span className="text-dark-400">Setup:</span> <span className="text-white">{viewingTrade.setup}</span></div>
              )}
              {viewingTrade.session && (
                <div><span className="text-dark-400">Session:</span> <span className="text-white">{viewingTrade.session}</span></div>
              )}
              {viewingTrade.timeframe && (
                <div><span className="text-dark-400">Timeframe:</span> <span className="text-white">{viewingTrade.timeframe}</span></div>
              )}
            </div>

            {/* What Worked / Mistakes */}
            <div className="grid grid-cols-2 gap-4">
              {(viewingTrade.whatWorked as string[])?.length > 0 && (
                <div>
                  <p className="text-xs text-dark-400 uppercase mb-2">What Worked</p>
                  <div className="flex flex-wrap gap-1">
                    {(viewingTrade.whatWorked as string[]).map((w, i) => (
                      <Badge key={i} variant="profit">{w}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {(viewingTrade.mistakes as string[])?.length > 0 && (
                <div>
                  <p className="text-xs text-dark-400 uppercase mb-2">Mistakes</p>
                  <div className="flex flex-wrap gap-1">
                    {(viewingTrade.mistakes as string[]).map((m, i) => (
                      <Badge key={i} variant="loss">{m}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reflection */}
            {(viewingTrade.whatIDid || viewingTrade.whatIShouldHaveDone) && (
              <div className="grid grid-cols-2 gap-4">
                {viewingTrade.whatIDid && (
                  <div>
                    <p className="text-xs text-dark-400 uppercase mb-1">What I Did</p>
                    <p className="text-sm text-dark-200">{viewingTrade.whatIDid}</p>
                  </div>
                )}
                {viewingTrade.whatIShouldHaveDone && (
                  <div>
                    <p className="text-xs text-dark-400 uppercase mb-1">What I Should Have Done</p>
                    <p className="text-sm text-dark-200">{viewingTrade.whatIShouldHaveDone}</p>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {viewingTrade.notes && (
              <div>
                <p className="text-xs text-dark-400 uppercase mb-1">Notes</p>
                <p className="text-sm text-dark-200">{viewingTrade.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button variant="secondary" onClick={() => setViewingTrade(null)}>Close</Button>
              <Button onClick={() => { setViewingTrade(null); openModal(viewingTrade); }}>Edit Trade</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Image Fullscreen Modal */}
      {imageModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setImageModal(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white">{imageModal.title}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = imageModal.url;
                    a.download = `${imageModal.title.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="px-3 py-1.5 text-xs bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Download
                </button>
                <button onClick={() => setImageModal(null)} className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <img loading="lazy" src={imageModal.url} alt={imageModal.title} className="w-full max-h-[80vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </PageShell>
  );
}

/* ═══════ TABULAR REPORT ═══════ */
function TabularReport({ trades, reportRange, setReportRange }: { trades: Trade[]; reportRange: { start: string; end: string }; setReportRange: (r: { start: string; end: string }) => void }) {
  const filtered = useMemo(() => trades.filter((t) => { const d = new Date(t.entryDate); return d >= new Date(reportRange.start) && d <= new Date(reportRange.end + "T23:59:59"); }).sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()), [trades, reportRange]);
  const taken = filtered.filter((t) => t.status === "closed" && !t.isMissed);
  const wins = taken.filter((t) => t.outcome === "win");
  const totalPnl = taken.reduce((s, t) => s + num(t.pnl), 0);
  const totalPips = taken.reduce((s, t) => s + num(t.pipsCaptured), 0);
  const byStrategy = useMemo(() => { const m = new Map<string, { w: number; l: number; pnl: number }>(); for (const t of taken) { const k = t.strategy || "No Strategy"; if (!m.has(k)) m.set(k, { w: 0, l: 0, pnl: 0 }); const d = m.get(k)!; if (t.outcome === "win") d.w++; else if (t.outcome === "loss") d.l++; d.pnl += num(t.pnl); } return [...m.entries()].map(([name, d]) => ({ name, ...d, total: d.w + d.l, wr: d.w + d.l > 0 ? (d.w / (d.w + d.l)) * 100 : 0 })).sort((a, b) => b.pnl - a.pnl); }, [taken]);
  const whatWorkedMap = new Map<string, number>(); const mistakesMap = new Map<string, number>();
  for (const t of taken) { for (const w of (t.whatWorked as string[]) || []) whatWorkedMap.set(w, (whatWorkedMap.get(w) || 0) + 1); for (const m of (t.mistakes as string[]) || []) mistakesMap.set(m, (mistakesMap.get(m) || 0) + 1); }
  const topWorked = [...whatWorkedMap.entries()].sort((a, b) => b[1] - a[1]);
  const topMistakes = [...mistakesMap.entries()].sort((a, b) => b[1] - a[1]);
  const withNotes = filtered.filter((t) => t.whatIDid || t.whatIShouldHaveDone || t.notes);
  const fmtSes = (t: Trade) => { const s = t.session ? t.session.replace("_", " ") : ""; const time = fmtTime(t.entryDate); return s ? `${s.charAt(0).toUpperCase() + s.slice(1)} · ${time}` : time; };

  return (
    <div className="space-y-5 print:space-y-3" id="tabular-report">
      {/* Controls */}
      <Card className="print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs text-dark-400 font-medium uppercase tracking-wider">Period</span>
          <Input type="date" value={reportRange.start} onChange={(e) => setReportRange({ ...reportRange, start: e.target.value })} className="!py-1.5 text-xs !w-36" />
          <span className="text-dark-500">→</span>
          <Input type="date" value={reportRange.end} onChange={(e) => setReportRange({ ...reportRange, end: e.target.value })} className="!py-1.5 text-xs !w-36" />
          <span className="text-[11px] text-dark-400">{filtered.length} trades in range</span>
          <div className="flex-1" />
          <Button variant="secondary" size="sm" onClick={() => exportTradeJournalPDF(trades, reportRange).catch((e: any) => alert('PDF Error: ' + e.message))}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Export PDF
          </Button>
        </div>
      </Card>

      {/* Summary Strip */}
      <div className="glass-card p-4 print:bg-white print:border print:border-gray-200 print:shadow-none">
        <p className="text-xs text-dark-400 print:text-gray-500 mb-3 font-medium uppercase tracking-wider">
          Performance Summary · {fmtDate(reportRange.start)} – {fmtDate(reportRange.end)}
        </p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <SC l="Trades" v={String(filtered.length)} />
          <SC l="Win / Loss" v={`${wins.length} / ${taken.length - wins.length}`} />
          <SC l="Win Rate" v={`${taken.length > 0 ? ((wins.length / taken.length) * 100).toFixed(1) : "0"}%`} p={taken.length > 0 && wins.length / taken.length >= 0.5} />
          <SC l="Net P&L" v={formatCurrency(totalPnl)} p={totalPnl >= 0} />
          <SC l="Total Pips" v={totalPips.toFixed(1)} p={totalPips >= 0} />
          <SC l="Avg / Trade" v={formatCurrency(taken.length > 0 ? totalPnl / taken.length : 0)} p={totalPnl >= 0} />
        </div>
      </div>

      {/* Strategy + Strengths/Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {byStrategy.length > 0 && (
          <Card padding={false} className="lg:col-span-1 print:shadow-none print:border print:border-gray-200">
            <div className="px-4 pt-4 pb-2"><h3 className="text-xs font-semibold text-dark-300 print:text-gray-600 uppercase tracking-wider">Strategy Breakdown</h3></div>
            <table className="w-full text-[11px] print:text-[10px]">
              <thead><tr className="border-b border-white/5 print:border-gray-200">{["Strategy","W/L","WR","P&L"].map(h=><th key={h} className="px-4 py-1.5 text-left text-dark-400 print:text-gray-500 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-white/5 print:divide-gray-100">{byStrategy.map(s=>(
                <tr key={s.name}><td className="px-4 py-1.5 text-white print:text-black">{s.name}</td><td className="px-4 py-1.5 text-dark-300">{s.w}/{s.l}</td><td className="px-4 py-1.5 text-dark-200">{s.wr.toFixed(0)}%</td><td className={`px-4 py-1.5 font-semibold ${s.pnl>=0?"text-profit":"text-loss"}`}>{formatCurrency(s.pnl)}</td></tr>
              ))}</tbody>
            </table>
          </Card>
        )}
        <Card className="print:shadow-none print:border print:border-gray-200">
          <h3 className="text-xs font-semibold text-dark-300 print:text-gray-600 uppercase tracking-wider mb-3">Strengths</h3>
          {topWorked.length===0?<p className="text-dark-500 text-[11px]">None recorded</p>:(
            <div className="space-y-1">{topWorked.map(([f,c])=>(<div key={f} className="flex justify-between text-[11px]"><span className="text-dark-200 print:text-gray-700">{f}</span><span className="text-dark-400">{c}×</span></div>))}</div>
          )}
        </Card>
        <Card className="print:shadow-none print:border print:border-gray-200">
          <h3 className="text-xs font-semibold text-dark-300 print:text-gray-600 uppercase tracking-wider mb-3">Weaknesses</h3>
          {topMistakes.length===0?<p className="text-dark-500 text-[11px]">None recorded</p>:(
            <div className="space-y-1">{topMistakes.map(([m,c])=>(<div key={m} className="flex justify-between text-[11px]"><span className="text-dark-200 print:text-gray-700">{m}</span><span className="text-dark-400">{c}×</span></div>))}</div>
          )}
        </Card>
      </div>

      {/* ─── TABLE 1: Complete Trade Log ─── */}
      <Card padding={false} className="print:shadow-none print:border print:border-gray-200">
        <div className="px-4 pt-4 pb-2"><h3 className="text-xs font-semibold text-dark-300 print:text-gray-600 uppercase tracking-wider">Table 1 — Complete Trade Log</h3></div>
        {filtered.length===0?<div className="p-6 text-center text-dark-400 text-[11px]">No trades found in this period.</div>:(
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] print:text-[9px]">
              <thead><tr className="border-b border-white/5 print:border-gray-200 bg-dark-800/50 print:bg-gray-50">
                {["#","Date & Time","Session","Symbol","Side","Entry","SL","TP","Exit","Pips","P&L","R","Strategy","Setup","TF","Result"].map(h=>(
                  <th key={h} className="px-2.5 py-2 text-left text-dark-400 print:text-gray-500 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-white/5 print:divide-gray-100">
                {filtered.map((t,i)=>(
                  <tr key={t.id} className="hover:bg-white/[0.015]">
                    <td className="px-2.5 py-1.5 text-dark-500">{i+1}</td>
                    <td className="px-2.5 py-1.5 text-dark-200 print:text-gray-700 whitespace-nowrap">{fmtDateTime(t.entryDate)}</td>
                    <td className="px-2.5 py-1.5 text-dark-300 print:text-gray-600 capitalize whitespace-nowrap">{t.session?.replace("_"," ")||"—"}</td>
                    <td className="px-2.5 py-1.5 text-white print:text-black font-semibold">{t.symbol}</td>
                    <td className="px-2.5 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${t.direction==="long"?"bg-profit/15 text-profit":"bg-loss/15 text-loss"}`}>{t.direction==="long"?"BUY":"SELL"}</span></td>
                    <td className="px-2.5 py-1.5 font-mono text-dark-200 print:text-gray-700">{formatPrice(t.entryPrice)}</td>
                    <td className="px-2.5 py-1.5 font-mono text-dark-400">{formatPrice(t.stopLoss)}</td>
                    <td className="px-2.5 py-1.5 font-mono text-dark-400">{formatPrice(t.takeProfit)}</td>
                    <td className="px-2.5 py-1.5 font-mono text-dark-200 print:text-gray-700">{formatPrice(t.exitPrice)}</td>
                    <td className="px-2.5 py-1.5">{t.pipsCaptured?<span className={num(t.pipsCaptured)>=0?"text-profit":"text-loss"}>{num(t.pipsCaptured)>=0?"+":""}{num(t.pipsCaptured).toFixed(1)}</span>:"—"}</td>
                    <td className="px-2.5 py-1.5">{t.pnl?<span className={`font-semibold ${num(t.pnl)>=0?"text-profit":"text-loss"}`}>{formatCurrency(num(t.pnl))}</span>:"—"}</td>
                    <td className="px-2.5 py-1.5">{t.rMultiple?<span className={num(t.rMultiple)>=0?"text-profit":"text-loss"}>{num(t.rMultiple)>=0?"+":""}{num(t.rMultiple).toFixed(2)}R</span>:"—"}</td>
                    <td className="px-2.5 py-1.5 text-dark-300">{t.strategy||"—"}</td>
                    <td className="px-2.5 py-1.5 text-dark-300">{t.setup||"—"}</td>
                    <td className="px-2.5 py-1.5 text-dark-300">{t.timeframe||"—"}</td>
                    <td className="px-2.5 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${resultVariant(t)==="profit"?"bg-profit/15 text-profit":resultVariant(t)==="loss"?"bg-loss/15 text-loss":resultVariant(t)==="warn"?"bg-warn/15 text-warn":"bg-dark-600 text-dark-200"}`}>{resultLabel(t)}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t-2 border-white/10 print:border-gray-300 bg-dark-800/30 print:bg-gray-50">
                <td colSpan={9} className="px-2.5 py-2 text-right text-dark-300 print:text-gray-600 font-semibold text-[11px]">TOTAL</td>
                <td className="px-2.5 py-2"><span className={`font-bold ${totalPips>=0?"text-profit":"text-loss"}`}>{totalPips>=0?"+":""}{totalPips.toFixed(1)}</span></td>
                <td className="px-2.5 py-2"><span className={`font-bold ${totalPnl>=0?"text-profit":"text-loss"}`}>{formatCurrency(totalPnl)}</span></td>
                <td colSpan={5}/>
              </tr></tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* ─── TABLE 2: Trade Notes & Reflections ─── */}
      <Card padding={false} className="print:shadow-none print:border print:border-gray-200">
        <div className="px-4 pt-4 pb-2"><h3 className="text-xs font-semibold text-dark-300 print:text-gray-600 uppercase tracking-wider">Table 2 — Trade Notes &amp; Reflections</h3></div>
        {withNotes.length===0?<div className="p-6 text-center text-dark-400 text-[11px]">No notes or reflections recorded in this period.</div>:(
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] print:text-[9px]">
              <thead><tr className="border-b border-white/5 print:border-gray-200 bg-dark-800/50 print:bg-gray-50">
                {["#","Date · Session","Symbol","Result","P&L","What I Did","What I Should Have Done","Notes"].map(h=>(
                  <th key={h} className="px-2.5 py-2 text-left text-dark-400 print:text-gray-500 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-white/5 print:divide-gray-100">
                {withNotes.map((t,i)=>(
                  <tr key={t.id} className="align-top hover:bg-white/[0.015]">
                    <td className="px-2.5 py-2 text-dark-500">{i+1}</td>
                    <td className="px-2.5 py-2 text-dark-200 print:text-gray-700 whitespace-nowrap">{fmtSes(t)}<br/><span className="text-dark-400 text-[10px]">{fmtDate(t.entryDate)}</span></td>
                    <td className="px-2.5 py-2 text-white print:text-black font-semibold">{t.symbol}</td>
                    <td className="px-2.5 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${resultVariant(t)==="profit"?"bg-profit/15 text-profit":resultVariant(t)==="loss"?"bg-loss/15 text-loss":resultVariant(t)==="warn"?"bg-warn/15 text-warn":"bg-dark-600 text-dark-200"}`}>{resultLabel(t)}</span></td>
                    <td className="px-2.5 py-2">{t.pnl?<span className={`font-semibold ${num(t.pnl)>=0?"text-profit":"text-loss"}`}>{formatCurrency(num(t.pnl))}</span>:"—"}</td>
                    <td className="px-2.5 py-2 text-dark-200 print:text-gray-700 max-w-[200px]"><p className="whitespace-pre-line leading-relaxed">{t.whatIDid||"—"}</p></td>
                    <td className="px-2.5 py-2 text-dark-200 print:text-gray-700 max-w-[200px]"><p className="whitespace-pre-line leading-relaxed">{t.whatIShouldHaveDone||"—"}</p></td>
                    <td className="px-2.5 py-2 text-dark-300 print:text-gray-600 max-w-[200px]"><p className="whitespace-pre-line leading-relaxed">{t.notes||"—"}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ─── TABLE 3: Strengths, Weaknesses, Do's & Don'ts ─── */}
      <Card padding={false} className="print:shadow-none print:border print:border-gray-200">
        <div className="px-4 pt-4 pb-2"><h3 className="text-xs font-semibold text-dark-300 print:text-gray-600 uppercase tracking-wider">Table 3 — Per-Trade Strengths &amp; Weaknesses</h3></div>
        {filtered.filter(t=>((t.whatWorked as string[])||[]).length>0||((t.mistakes as string[])||[]).length>0).length===0?<div className="p-6 text-center text-dark-400 text-[11px]">No strengths or weaknesses tagged on trades in this period.</div>:(
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] print:text-[9px]">
              <thead><tr className="border-b border-white/5 print:border-gray-200 bg-dark-800/50 print:bg-gray-50">
                {["#","Date · Session","Symbol","Side","Result","P&L","What Worked (Do's)","Mistakes (Don'ts)"].map(h=>(
                  <th key={h} className="px-2.5 py-2 text-left text-dark-400 print:text-gray-500 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-white/5 print:divide-gray-100">
                {filtered.filter(t=>((t.whatWorked as string[])||[]).length>0||((t.mistakes as string[])||[]).length>0).map((t,i)=>(
                  <tr key={t.id} className="align-top hover:bg-white/[0.015]">
                    <td className="px-2.5 py-2 text-dark-500">{i+1}</td>
                    <td className="px-2.5 py-2 text-dark-200 print:text-gray-700 whitespace-nowrap">{fmtSes(t)}<br/><span className="text-dark-400 text-[10px]">{fmtDate(t.entryDate)}</span></td>
                    <td className="px-2.5 py-2 text-white print:text-black font-semibold">{t.symbol}</td>
                    <td className="px-2.5 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${t.direction==="long"?"bg-profit/15 text-profit":"bg-loss/15 text-loss"}`}>{t.direction==="long"?"BUY":"SELL"}</span></td>
                    <td className="px-2.5 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${resultVariant(t)==="profit"?"bg-profit/15 text-profit":resultVariant(t)==="loss"?"bg-loss/15 text-loss":resultVariant(t)==="warn"?"bg-warn/15 text-warn":"bg-dark-600 text-dark-200"}`}>{resultLabel(t)}</span></td>
                    <td className="px-2.5 py-2">{t.pnl?<span className={`font-semibold ${num(t.pnl)>=0?"text-profit":"text-loss"}`}>{formatCurrency(num(t.pnl))}</span>:"—"}</td>
                    <td className="px-2.5 py-2 max-w-[180px]">
                      {((t.whatWorked as string[])||[]).length>0?(
                        <div className="flex flex-wrap gap-1">{((t.whatWorked as string[])||[]).map((w,j)=><span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-profit/10 text-profit print:bg-green-50 print:text-green-700 whitespace-nowrap">{w}</span>)}</div>
                      ):<span className="text-dark-500">—</span>}
                    </td>
                    <td className="px-2.5 py-2 max-w-[180px]">
                      {((t.mistakes as string[])||[]).length>0?(
                        <div className="flex flex-wrap gap-1">{((t.mistakes as string[])||[]).map((m,j)=><span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-loss/10 text-loss print:bg-red-50 print:text-red-700 whitespace-nowrap">{m}</span>)}</div>
                      ):<span className="text-dark-500">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function SC({ l, v, p }: { l: string; v: string; p?: boolean }) {
  return (
    <div className="text-center py-2 px-1 bg-dark-800/50 rounded-lg print:bg-gray-50 print:border print:border-gray-200">
      <p className={`text-base font-bold leading-tight ${p===undefined?"text-white print:text-black":p?"text-profit":"text-loss"}`}>{v}</p>
      <p className="text-[9px] text-dark-400 print:text-gray-500 uppercase mt-1 tracking-wider">{l}</p>
    </div>
  );
}

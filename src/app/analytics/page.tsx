"use client";

import { useState, useMemo, useCallback } from "react";
import { useTrades, useSettings } from "@/hooks/use-data";
import { PageShell, Card, Badge, Button, Input, Modal } from "@/components/ui";
import {
  EquityChart,
  PnlBarChart,
  CumulativePnlChart,
  RDistributionChart,
  DecisionQualityRadar,
  PerformanceBarChart,
  MarketPieChart,
} from "@/components/charts";
import { JournalViewer, InteractiveCalendarHeatmap } from "@/components/journal-viewer";
import { exportInsightsPDF, exportTradeJournalPDF } from "@/lib/pdf-export";
import { InsightEngine, type PatternInsight, type DimensionPerformance, type MistakeAnalysis } from "@/lib/insight-engine";
import { formatCurrency, num, calculateDailyPnl } from "@/lib/calculations";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, parseISO } from "date-fns";
import type { Trade } from "@/db/schema";

export default function AnalyticsPage() {
  const [tab, setTab] = useState("insights");
  const [dateRange, setDateRange] = useState({ start: format(subMonths(new Date(), 3), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") });
  const [quickRange, setQuickRange] = useState("3M");
  const { settings } = useSettings();
  const { trades, loading } = useTrades({ accountId: settings?.id });

  const filteredTrades = useMemo(() => trades.filter((t) => {
    const d = new Date(t.entryDate);
    return d >= new Date(dateRange.start) && d <= new Date(dateRange.end + "T23:59:59");
  }), [trades, dateRange]);

  const engine = useMemo(() => new InsightEngine(filteredTrades), [filteredTrades]);
  const allEngine = useMemo(() => new InsightEngine(trades), [trades]);

  const handleQuickRange = useCallback((r: string) => {
    setQuickRange(r);
    const end = new Date();
    let start: Date;
    switch (r) {
      case "1W": start = subDays(end, 7); break;
      case "1M": start = subMonths(end, 1); break;
      case "3M": start = subMonths(end, 3); break;
      case "6M": start = subMonths(end, 6); break;
      case "1Y": start = subMonths(end, 12); break;
      case "YTD": start = startOfYear(end); break;
      case "ALL": start = new Date(2020, 0, 1); break;
      default: start = subMonths(end, 3);
    }
    setDateRange({ start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd") });
  }, []);

  const tabs = [
    { value: "insights", label: "Key Insights" },
    { value: "patterns", label: "Patterns & Habits" },
    { value: "calendar", label: "Calendar" },
    { value: "journal", label: "Journal Preview" },
    { value: "performance", label: "Deep Analysis" },
    { value: "recommendations", label: "Recommendations" },
  ];

  return (
    <PageShell title="Insight Engine" subtitle="What to keep doing, stop doing, and improve"
      actions={
        <Button variant="secondary" size="sm" onClick={() => {
          const p = engine.detectPatterns();
          const m = engine.analyzeMistakes();
          const w = engine.analyzeWhatWorked();
          exportInsightsPDF(filteredTrades, p, m, w, dateRange).catch((e: any) => alert("PDF Error: " + e.message));
        }}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>Export PDF</Button>
      }
    >
      {/* Period selector */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs text-dark-400 font-medium uppercase tracking-wider">Period:</span>
        {["1W", "1M", "3M", "6M", "1Y", "YTD", "ALL"].map((r) => (
          <button key={r} onClick={() => handleQuickRange(r)} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${quickRange === r ? "bg-accent-500 text-white shadow-lg shadow-accent-500/20" : "bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700"}`}>{r}</button>
        ))}
        <div className="h-5 w-px bg-white/10 mx-1" />
        <Input type="date" value={dateRange.start} onChange={(e) => { setDateRange((p) => ({ ...p, start: e.target.value })); setQuickRange(""); }} className="!py-1.5 text-xs !w-36" />
        <span className="text-dark-500">→</span>
        <Input type="date" value={dateRange.end} onChange={(e) => { setDateRange((p) => ({ ...p, end: e.target.value })); setQuickRange(""); }} className="!py-1.5 text-xs !w-36" />
        <span className="text-xs text-dark-400">{filteredTrades.filter((t) => t.status === "closed").length} closed trades</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-dark-800/50 p-1 rounded-lg overflow-x-auto" role="tablist">
        {tabs.map((t) => (
          <button key={t.value} role="tab" aria-selected={tab === t.value} onClick={() => setTab(t.value)} className={`px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${tab === t.value ? "bg-accent-500/15 text-accent-400" : "text-dark-400 hover:text-dark-200 hover:bg-white/5"}`}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <Card><div className="h-48 animate-pulse bg-dark-700 rounded" /></Card>
      ) : (
        <>
          {tab === "insights" && <InsightsTab engine={engine} settings={settings} />}
          {tab === "patterns" && <PatternsTab engine={engine} />}
          {tab === "calendar" && <CalendarTab trades={trades} allEngine={allEngine} />}
          {tab === "journal" && <JournalTab trades={trades} />}
          {tab === "performance" && <PerformanceTab engine={engine} filteredTrades={filteredTrades} settings={settings} />}
          {tab === "recommendations" && <RecommendationsTab engine={engine} />}
        </>
      )}
    </PageShell>
  );
}

/* ═════════════════ INSIGHTS TAB ═════════════════ */
function InsightsTab({ engine, settings }: { engine: InsightEngine; settings: { startingBalance?: string } | null }) {
  const summary = engine.generateSummary();
  const metrics = engine.calculateMetrics();
  const equity = engine.getEquityCurve(num(settings?.startingBalance) || 10000);
  const dq = engine.calculateDecisionQuality();
  const patterns = engine.detectPatterns();
  const mistakes = engine.analyzeMistakes();
  const whatWorked = engine.analyzeWhatWorked();

  if (!summary.hasEnoughData) return <NeedMoreData current={summary.currentTrades} required={summary.minTradesRequired} />;

  return (
    <div className="space-y-6">
      {/* Primary insight banner */}
      <div className="glass-card p-6 border-l-4 border-accent-500 flex items-start gap-4">
        <div className="p-3 rounded-xl bg-accent-500/10 text-accent-400 shrink-0">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Top Insight</p>
          <p className="text-lg font-semibold text-white">{summary.primaryInsight}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-bold text-accent-400">{summary.dataQualityScore}<span className="text-sm">%</span></p>
          <p className="text-[10px] text-dark-400">Data Quality</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <Kpi label="Total P&L" value={formatCurrency(metrics.totalPnl)} positive={metrics.totalPnl >= 0} />
        <Kpi label="Win Rate" value={`${metrics.winRate}%`} positive={metrics.winRate >= 50} />
        <Kpi label="Profit Factor" value={metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2)} positive={metrics.profitFactor >= 1} />
        <Kpi label="Avg R" value={`${metrics.avgRMultiple >= 0 ? "+" : ""}${metrics.avgRMultiple}R`} positive={metrics.avgRMultiple >= 0} />
        <Kpi label="Avg Pips" value={metrics.avgPips.toFixed(1)} positive={metrics.avgPips >= 0} />
        <Kpi label="Expectancy" value={formatCurrency(metrics.expectancy)} positive={metrics.expectancy >= 0} />
      </div>

      {/* 3-column action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionList title="✓ Keep Doing" items={summary.keepDoing} color="profit" empty="Add trade details to discover" />
        <ActionList title="✗ Stop Doing" items={summary.stopDoing} color="loss" empty="Tag mistakes on losing trades" />
        <ActionList title="↑ Improve" items={summary.improve} color="accent" empty="Trade more to uncover areas" />
      </div>

      {/* Equity + Decision Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <h3 className="text-sm font-semibold text-white mb-4">Equity Curve</h3>
          <EquityChart data={equity} />
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-2">Decision Quality</h3>
          {dq.overall > 0 ? (
            <>
              <div className="text-center mb-2">
                <span className="text-4xl font-bold text-white">{dq.overall}</span>
                <span className="text-dark-400 text-sm ml-1">/ 100</span>
              </div>
              <DecisionQualityRadar data={dq.components} />
            </>
          ) : <p className="text-dark-400 text-sm text-center py-8">Add strategy & setup to unlock</p>}
        </Card>
      </div>

      {/* What Worked & Mistakes side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-profit" />Common Habits in Winning Trades</h3>
          {whatWorked.length === 0 ? <EmptyHint text='Tag "What Worked" on winning trades to discover your edge' /> : (
            <div className="space-y-2">{whatWorked.slice(0, 8).map((w, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-profit/5 border border-profit/10 rounded-lg">
                <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-profit/20 text-profit text-[10px] flex items-center justify-center font-bold">{i + 1}</span><span className="text-sm text-white">{w.factor}</span></div>
                <div className="flex items-center gap-3"><span className="text-xs text-dark-400">{w.occurrences}× in wins</span><span className="text-profit text-sm font-semibold">+{formatCurrency(w.totalProfit)}</span></div>
              </div>
            ))}</div>
          )}
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-loss" />Common Habits in Losing Trades</h3>
          {mistakes.length === 0 ? <EmptyHint text='Tag "Mistakes" on losing trades to learn from them' /> : (
            <div className="space-y-2">{mistakes.slice(0, 8).map((m, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-loss/5 border border-loss/10 rounded-lg">
                <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-loss/20 text-loss text-[10px] flex items-center justify-center font-bold">{i + 1}</span><div><span className="text-sm text-white">{m.mistake}</span><p className="text-[10px] text-dark-400">{m.percentOfLosses}% of all losses</p></div></div>
                <span className="text-loss text-sm font-semibold">-{formatCurrency(m.totalLoss)}</span>
              </div>
            ))}</div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ═════════════════ PATTERNS TAB ═════════════════ */
function PatternsTab({ engine }: { engine: InsightEngine }) {
  const patterns = engine.detectPatterns();
  const confluences = engine.analyzeConfluences();
  const byStrategy = engine.analyzeDimension("strategy").filter((s) => s.name !== "Unknown");
  const bySetup = engine.analyzeDimension("setup").filter((s) => s.name !== "Unknown");
  const bySession = engine.analyzeDimension("session").filter((s) => s.name !== "Unknown");
  const byTimeframe = engine.analyzeDimension("timeframe").filter((s) => s.name !== "Unknown");
  const bySymbol = engine.analyzeDimension("symbol");
  const byDirection = engine.analyzeDimension("direction");
  const byHour = engine.analyzeByHour();
  const byWeekday = engine.analyzeByWeekday();

  const winning = patterns.filter((p) => p.type === "winning");
  const losing = patterns.filter((p) => p.type === "losing");

  return (
    <div className="space-y-6">
      {/* Discovered patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-profit" />Profitable Patterns ({winning.length})</h3>
          {winning.length === 0 ? <EmptyHint text="Log more trades with details to discover patterns" /> : (
            <div className="space-y-3">{winning.map((p, i) => <PatternRow key={i} p={p} />)}</div>
          )}
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-loss" />Costly Patterns ({losing.length})</h3>
          {losing.length === 0 ? <EmptyHint text="No costly patterns detected yet" /> : (
            <div className="space-y-3">{losing.map((p, i) => <PatternRow key={i} p={p} />)}</div>
          )}
        </Card>
      </div>

      {/* High-prob confluences */}
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">High-Probability Confluences</h3>
        {confluences.length === 0 ? <EmptyHint text="Add strategy, setup, session & timeframe to trades to discover confluences" /> : (
          <div className="space-y-2">{confluences.slice(0, 10).map((c, i) => (
            <div key={i} className={`flex flex-wrap items-center justify-between p-3 rounded-lg border ${c.grade === "A+" || c.grade === "A" ? "bg-profit/5 border-profit/15" : "bg-dark-800 border-white/5"}`}>
              <div className="flex flex-wrap gap-1.5">{c.factors.map((f, j) => <Badge key={j} variant={c.grade === "A+" || c.grade === "A" ? "profit" : "default"}>{f}</Badge>)}</div>
              <div className="flex items-center gap-4 text-sm mt-1 sm:mt-0"><span className="text-dark-400">{c.trades} trades</span><span className={c.avgPnl >= 0 ? "text-profit" : "text-loss"}>{c.winRate}% WR</span><Badge variant={c.grade === "A+" || c.grade === "A" ? "profit" : c.grade === "F" || c.grade === "D" ? "loss" : "default"}>{c.grade}</Badge></div>
            </div>
          ))}</div>
        )}
      </Card>

      {/* Dimension tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DimTable title="By Instrument" data={bySymbol} />
        <DimTable title="By Strategy" data={byStrategy} />
        <DimTable title="By Setup" data={bySetup} />
        <DimTable title="By Session" data={bySession} />
        <DimTable title="By Timeframe" data={byTimeframe} />
        <Card>
          <h3 className="text-sm font-semibold text-white mb-3">Direction Bias</h3>
          {byDirection.map((d) => (
            <div key={d.name} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg mb-2">
              <div className="flex items-center gap-2">
                <Badge variant={d.name === "long" ? "profit" : "loss"}>{d.name === "long" ? "LONG" : "SHORT"}</Badge>
                <span className="text-sm text-dark-300">{d.trades} trades</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-dark-300">{d.winRate}% WR</span>
                <span className={`text-sm font-semibold ${d.pnl >= 0 ? "text-profit" : "text-loss"}`}>{formatCurrency(d.pnl)}</span>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Time-based */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-white mb-3">By Weekday</h3>
          {byWeekday.length === 0 ? <EmptyHint text="Need more trades" /> : (
            <div className="space-y-1.5">{byWeekday.sort((a, b) => b.pnl - a.pnl).map((d) => (
              <div key={d.name} className="flex items-center gap-3 text-sm">
                <span className="w-24 text-dark-300 shrink-0">{d.name}</span>
                <div className="flex-1 h-5 bg-dark-800 rounded-full overflow-hidden relative"><div className={`h-full ${d.pnl >= 0 ? "bg-profit/40" : "bg-loss/40"}`} style={{ width: `${Math.min(100, d.winRate)}%` }} /><span className="absolute inset-0 flex items-center justify-center text-[10px] text-white">{d.winRate}%</span></div>
                <span className={`w-20 text-right font-semibold ${d.pnl >= 0 ? "text-profit" : "text-loss"}`}>{formatCurrency(d.pnl)}</span>
              </div>
            ))}</div>
          )}
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-white mb-3">By Hour</h3>
          {byHour.length === 0 ? <EmptyHint text="Need more trades" /> : (
            <div className="space-y-1.5">{byHour.sort((a, b) => b.pnl - a.pnl).slice(0, 10).map((h) => (
              <div key={h.name} className="flex items-center gap-3 text-sm">
                <span className="w-14 text-dark-300 shrink-0">{h.name}</span>
                <div className="flex-1 h-5 bg-dark-800 rounded-full overflow-hidden relative"><div className={`h-full ${h.pnl >= 0 ? "bg-profit/40" : "bg-loss/40"}`} style={{ width: `${Math.min(100, h.winRate)}%` }} /><span className="absolute inset-0 flex items-center justify-center text-[10px] text-white">{h.winRate}%</span></div>
                <span className={`w-20 text-right font-semibold ${h.pnl >= 0 ? "text-profit" : "text-loss"}`}>{formatCurrency(h.pnl)}</span>
              </div>
            ))}</div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ═════════════════ CALENDAR TAB ═════════════════ */
function CalendarTab({ trades, allEngine }: { trades: Trade[]; allEngine: InsightEngine }) {
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const calendarData = allEngine.generateCalendarData();

  return (
    <div className="space-y-6">
      <Card>
        <InteractiveCalendarHeatmap
          data={calendarData}
          year={calendarDate.getFullYear()}
          month={calendarDate.getMonth()}
          onDateClick={(d) => setSelectedDate(d)}
          onMonthChange={(y, m) => setCalendarDate(new Date(y, m, 1))}
        />
      </Card>

      {selectedDate && (
        <div className="animate-fade-in">
          <JournalViewer
            trades={trades}
            startDate={selectedDate}
            endDate={selectedDate}
            title={`Trades on ${format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")}`}
            onClose={() => setSelectedDate(null)}
          />
        </div>
      )}

      <Card>
        <h3 className="text-sm font-semibold text-white mb-3">{format(calendarDate, "MMMM yyyy")} Summary</h3>
        <MonthStats trades={trades} year={calendarDate.getFullYear()} month={calendarDate.getMonth()} />
      </Card>
    </div>
  );
}

function MonthStats({ trades, year, month }: { trades: Trade[]; year: number; month: number }) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  const monthTrades = trades.filter((t) => { const d = new Date(t.entryDate); return d >= start && d <= end; });
  const closed = monthTrades.filter((t) => t.status === "closed");
  const wins = closed.filter((t) => t.outcome === "win");
  const pnl = closed.reduce((s, t) => s + num(t.pnl), 0);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Kpi label="Trades" value={String(monthTrades.length)} positive />
      <Kpi label="Win Rate" value={`${closed.length > 0 ? ((wins.length / closed.length) * 100).toFixed(0) : 0}%`} positive={closed.length > 0 && wins.length / closed.length >= 0.5} />
      <Kpi label="P&L" value={formatCurrency(pnl)} positive={pnl >= 0} />
      <Kpi label="W / L" value={`${wins.length} / ${closed.length - wins.length}`} positive={wins.length >= closed.length - wins.length} />
    </div>
  );
}

/* ═════════════════ JOURNAL TAB ═════════════════ */
function JournalTab({ trades }: { trades: Trade[] }) {
  const [range, setRange] = useState({ start: format(startOfWeek(new Date()), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") });
  const [preset, setPreset] = useState("week");

  const handlePreset = (p: string) => {
    setPreset(p);
    const now = new Date();
    switch (p) {
      case "today": setRange({ start: format(now, "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") }); break;
      case "yesterday": { const y = subDays(now, 1); setRange({ start: format(y, "yyyy-MM-dd"), end: format(y, "yyyy-MM-dd") }); break; }
      case "week": setRange({ start: format(startOfWeek(now), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") }); break;
      case "lastWeek": { const s = startOfWeek(subDays(now, 7)); const e = endOfWeek(subDays(now, 7)); setRange({ start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") }); break; }
      case "month": setRange({ start: format(startOfMonth(now), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") }); break;
      case "lastMonth": { const lm = subMonths(now, 1); setRange({ start: format(startOfMonth(lm), "yyyy-MM-dd"), end: format(endOfMonth(lm), "yyyy-MM-dd") }); break; }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Select Journal Period</h3>
        <div className="flex flex-wrap items-center gap-3">
          {["today", "yesterday", "week", "lastWeek", "month", "lastMonth"].map((p) => (
            <button key={p} onClick={() => handlePreset(p)} className={`px-4 py-2 text-sm rounded-lg transition-all ${preset === p ? "bg-accent-500 text-white shadow-lg shadow-accent-500/20" : "bg-dark-800 text-dark-300 hover:text-white"}`}>
              {p === "today" ? "Today" : p === "yesterday" ? "Yesterday" : p === "week" ? "This Week" : p === "lastWeek" ? "Last Week" : p === "month" ? "This Month" : "Last Month"}
            </button>
          ))}
          <div className="h-5 w-px bg-white/10" />
          <Input type="date" value={range.start} onChange={(e) => { setRange((p) => ({ ...p, start: e.target.value })); setPreset(""); }} className="!py-1.5 text-sm !w-40" />
          <span className="text-dark-500">→</span>
          <Input type="date" value={range.end} onChange={(e) => { setRange((p) => ({ ...p, end: e.target.value })); setPreset(""); }} className="!py-1.5 text-sm !w-40" />
        </div>
      </Card>
      <JournalViewer trades={trades} startDate={range.start} endDate={range.end} />
    </div>
  );
}

/* ═════════════════ PERFORMANCE TAB ═════════════════ */
function PerformanceTab({ engine, filteredTrades, settings }: { engine: InsightEngine; filteredTrades: Trade[]; settings: { startingBalance?: string } | null }) {
  const metrics = engine.calculateMetrics();
  const rDist = engine.getRDistribution();
  const equity = engine.getEquityCurve(num(settings?.startingBalance) || 10000);
  const dailyPnl = calculateDailyPnl(filteredTrades);
  const bySymbol = engine.analyzeDimension("symbol");
  const pieData = bySymbol.map((s) => ({ name: s.name, value: s.trades }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Kpi label="Total P&L" value={formatCurrency(metrics.totalPnl)} positive={metrics.totalPnl >= 0} />
        <Kpi label="Win Rate" value={`${metrics.winRate}%`} positive={metrics.winRate >= 50} />
        <Kpi label="Profit Factor" value={metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2)} positive={metrics.profitFactor >= 1} />
        <Kpi label="Sharpe" value={metrics.sharpeRatio.toFixed(2)} positive={metrics.sharpeRatio >= 1} />
        <Kpi label="Avg Win" value={formatCurrency(metrics.avgWin)} positive />
        <Kpi label="Avg Loss" value={formatCurrency(metrics.avgLoss)} positive={false} />
        <Kpi label="Max DD" value={formatCurrency(metrics.maxDrawdown)} positive={false} />
        <Kpi label="Avg R:R" value={metrics.avgRiskReward.toFixed(2)} positive={metrics.avgRiskReward >= 1} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><h3 className="text-sm font-semibold text-white mb-4">Equity Curve</h3><EquityChart data={equity} /></Card>
        <Card><h3 className="text-sm font-semibold text-white mb-4">Cumulative P&L</h3><CumulativePnlChart data={dailyPnl} /></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><h3 className="text-sm font-semibold text-white mb-4">Daily P&L</h3><PnlBarChart data={dailyPnl} /></Card>
        <Card><h3 className="text-sm font-semibold text-white mb-4">R-Multiple Distribution</h3><RDistributionChart data={rDist} /></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card><h3 className="text-sm font-semibold text-white mb-4">Instrument Distribution</h3><MarketPieChart data={pieData.length > 0 ? pieData : []} /></Card>
        <Card><h3 className="text-sm font-semibold text-white mb-4">Instrument P&L</h3><PerformanceBarChart data={bySymbol} /></Card>
        <Card><h3 className="text-sm font-semibold text-white mb-4">Instrument Win Rate</h3><PerformanceBarChart data={bySymbol} valueKey="winRate" /></Card>
      </div>

      {/* Detailed metrics */}
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Detailed Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ["Total Trades", metrics.totalTrades],
            ["Wins", metrics.winningTrades],
            ["Losses", metrics.losingTrades],
            ["Breakeven", metrics.breakevenTrades],
            ["Largest Win", formatCurrency(metrics.largestWin)],
            ["Largest Loss", formatCurrency(metrics.largestLoss)],
            ["Max Win Streak", metrics.maxConsecutiveWins],
            ["Max Loss Streak", metrics.maxConsecutiveLosses],
            ["Avg R Multiple", metrics.avgRMultiple.toFixed(2) + "R"],
            ["Avg Pips", metrics.avgPips.toFixed(1)],
            ["Avg Hold Time", metrics.avgHoldingTime.toFixed(1) + "h"],
            ["Expectancy", formatCurrency(metrics.expectancy)],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-center justify-between text-sm p-2">
              <span className="text-dark-400">{String(label)}</span>
              <span className="text-white font-medium">{String(value)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ═════════════════ RECOMMENDATIONS TAB ═════════════════ */
function RecommendationsTab({ engine }: { engine: InsightEngine }) {
  const summary = engine.generateSummary();
  const playbook = engine.generatePlaybook();
  const mistakes = engine.analyzeMistakes();
  const dq = engine.calculateDecisionQuality();

  if (!summary.hasEnoughData) return <NeedMoreData current={summary.currentTrades} required={summary.minTradesRequired} />;

  return (
    <div className="space-y-6">
      {/* Priority fix */}
      {mistakes.length > 0 && (
        <div className="glass-card p-6 border-l-4 border-loss">
          <h3 className="text-base font-bold text-white mb-2">🎯 Fix This First</h3>
          <p className="text-dark-300">Eliminating <span className="text-loss font-semibold">&quot;{mistakes[0].mistake}&quot;</span> could save you <span className="text-loss font-semibold">{formatCurrency(mistakes[0].totalLoss)}</span></p>
          <p className="text-xs text-dark-400 mt-2">{mistakes[0].recommendation}</p>
        </div>
      )}

      {/* A+ setups */}
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Your Best Setups (Auto-generated Playbook)</h3>
        {playbook.aSetups.length === 0 ? <EmptyHint text="Add strategies to trades to discover your A+ setups" /> : (
          <div className="space-y-3">{playbook.aSetups.map((s, i) => (
            <div key={i} className="p-4 bg-profit/5 border border-profit/15 rounded-lg">
              <div className="flex items-center justify-between mb-2"><h4 className="font-semibold text-white">{s.name}</h4><div className="flex items-center gap-2"><span className="text-xs text-dark-400">{s.performance.trades} trades</span><span className="text-profit text-sm font-semibold">{s.performance.winRate}% WR</span><Badge variant="profit">{s.performance.grade}</Badge></div></div>
              {s.conditions.length > 0 && <div className="flex flex-wrap gap-1.5">{s.conditions.map((c, j) => <Badge key={j} variant="accent">{c}</Badge>)}</div>}
            </div>
          ))}</div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-white mb-3">✓ Evidence-Based Rules</h3>
          {playbook.rules.length === 0 ? <EmptyHint text="More data needed" /> : (
            <ul className="space-y-2">{playbook.rules.map((r, i) => <li key={i} className="flex items-start gap-2 text-sm p-2 bg-profit/5 rounded-lg"><span className="text-profit">✓</span><span className="text-dark-200">{r}</span></li>)}</ul>
          )}
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-white mb-3">✗ Avoid List</h3>
          {playbook.avoidList.length === 0 ? <EmptyHint text="No items to avoid yet" /> : (
            <ul className="space-y-2">{playbook.avoidList.map((a, i) => <li key={i} className="flex items-start gap-2 text-sm p-2 bg-loss/5 rounded-lg"><span className="text-loss">✗</span><span className="text-dark-200">{a}</span></li>)}</ul>
          )}
        </Card>
      </div>

      {/* Improvement areas */}
      {dq.overall > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Areas for Improvement</h3>
          <div className="space-y-3">
            {Object.entries(dq.components).map(([key, value]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1"><span className="text-sm text-dark-300 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span><span className={`text-sm font-medium ${value >= 70 ? "text-profit" : value >= 40 ? "text-warn" : "text-loss"}`}>{value}%</span></div>
                <div className="h-2 bg-dark-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${value >= 70 ? "bg-profit" : value >= 40 ? "bg-warn" : "bg-loss"}`} style={{ width: `${value}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Optimal conditions */}
      {playbook.optimalConditions.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-white mb-3">Optimal Trading Conditions</h3>
          <div className="space-y-2">{playbook.optimalConditions.map((c, i) => (
            <div key={i} className="p-3 bg-accent-500/10 border border-accent-500/20 rounded-lg text-sm text-accent-400">{c}</div>
          ))}</div>
        </Card>
      )}
    </div>
  );
}

/* ═════════════════ REUSABLE COMPONENTS ═════════════════ */
function Kpi({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (<div className="bg-dark-800/60 rounded-lg p-3 text-center"><p className={`text-lg font-bold ${positive ? "text-profit" : "text-loss"}`}>{value}</p><p className="text-[10px] text-dark-400 uppercase mt-0.5">{label}</p></div>);
}

function ActionList({ title, items, color, empty }: { title: string; items: string[]; color: "profit" | "loss" | "accent"; empty: string }) {
  const cls = { profit: "border-profit/30 bg-profit/5", loss: "border-loss/30 bg-loss/5", accent: "border-accent-500/30 bg-accent-500/5" };
  return (
    <div className={`glass-card p-4 border-l-4 ${cls[color]}`}>
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      {items.length === 0 ? <p className="text-xs text-dark-400">{empty}</p> : (
        <ul className="space-y-2">{items.slice(0, 5).map((it, i) => <li key={i} className="text-xs text-dark-200 flex items-start gap-1.5"><span className={color === "profit" ? "text-profit" : color === "loss" ? "text-loss" : "text-accent-400"}>•</span>{it}</li>)}</ul>
      )}
    </div>
  );
}

function PatternRow({ p }: { p: PatternInsight }) {
  const win = p.type === "winning";
  return (
    <div className={`p-3 rounded-lg border ${win ? "bg-profit/5 border-profit/15" : "bg-loss/5 border-loss/15"}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div><h4 className="text-sm font-medium text-white">{p.pattern}</h4><p className="text-[11px] text-dark-400">{p.description}</p></div>
        <div className="text-right shrink-0"><p className={`text-sm font-semibold ${win ? "text-profit" : "text-loss"}`}>{p.financialImpact >= 0 ? "+" : ""}{formatCurrency(p.financialImpact)}</p><p className="text-[10px] text-dark-400">{p.confidence.toFixed(0)}% conf</p></div>
      </div>
      <p className="text-xs text-dark-200 pt-2 border-t border-white/5">💡 {p.actionable}</p>
    </div>
  );
}

function DimTable({ title, data }: { title: string; data: DimensionPerformance[] }) {
  if (data.length === 0) return <Card><h3 className="text-sm font-semibold text-white mb-3">{title}</h3><EmptyHint text="No data recorded" /></Card>;
  return (
    <Card padding={false}>
      <div className="p-5 pb-3"><h3 className="text-sm font-semibold text-white">{title}</h3></div>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/5">{["Name", "Trades", "WR", "P&L", "Grade"].map((h) => <th key={h} className="px-4 py-2 text-left text-xs text-dark-400">{h}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{data.map((d) => (
        <tr key={d.name} className="hover:bg-white/[0.02]"><td className="px-4 py-2 text-white">{d.name}</td><td className="px-4 py-2 text-dark-300">{d.trades}</td><td className="px-4 py-2"><span className={d.winRate >= 50 ? "text-profit" : "text-loss"}>{d.winRate}%</span></td><td className="px-4 py-2"><span className={d.pnl >= 0 ? "text-profit" : "text-loss"}>{formatCurrency(d.pnl)}</span></td><td className="px-4 py-2"><Badge variant={d.grade === "A+" || d.grade === "A" ? "profit" : d.grade === "F" || d.grade === "D" ? "loss" : "default"}>{d.grade}</Badge></td></tr>
      ))}</tbody></table></div>
    </Card>
  );
}

function NeedMoreData({ current, required }: { current: number; required: number }) {
  return (
    <Card className="text-center py-12">
      <div className="p-4 rounded-2xl bg-accent-500/10 text-accent-400 w-fit mx-auto mb-4">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
      </div>
      <h3 className="text-lg font-bold text-white mb-2">Building Your Insights</h3>
      <p className="text-dark-300 text-sm mb-4">You have {current} closed trades. Log {Math.max(0, required - current)} more to unlock this section.</p>
      <div className="w-full max-w-xs mx-auto bg-dark-800 rounded-full h-2"><div className="bg-accent-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (current / required) * 100)}%` }} /></div>
    </Card>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-dark-400 text-sm py-4 text-center">{text}</p>;
}

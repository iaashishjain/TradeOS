"use client";

import { useEffect, useMemo, useState } from "react";
import { useTrades, useSettings } from "@/hooks/use-data";
import { InsightEngine, num } from "@/lib/insight-engine";
import {
  calculatePerformanceMetrics,
  calculateEquityCurve,
  calculateDailyPnl,
  getTradesByMarket,
  formatCurrency,
  formatPercent,
  fmtDateFull,
  fmtDateTime,
} from "@/lib/calculations";
import { PageShell, Card, Badge, Button, Input } from "@/components/ui";
import { exportDashboardPDF } from "@/lib/pdf-export";
import { EquityChart, PnlBarChart, MarketPieChart } from "@/components/charts";
import { format, subDays, subMonths, startOfYear } from "date-fns";
import Link from "next/link";

export default function DashboardPage() {
  const { settings } = useSettings();
  const { trades, loading } = useTrades({ accountId: settings?.id });
  const [dateRange, setDateRange] = useState({ start: format(subMonths(new Date(), 3), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") });
  const [quickRange, setQuickRange] = useState("3M");

  

  const filteredTrades = useMemo(() => trades.filter((t) => {
    const d = new Date(t.entryDate);
    return d >= new Date(dateRange.start) && d <= new Date(dateRange.end + "T23:59:59");
  }), [trades, dateRange]);

  const startingBalance = num(settings?.startingBalance) || 10000;
  const currency = settings?.currency || "USD";
  const metrics = calculatePerformanceMetrics(filteredTrades);
  const equityCurve = calculateEquityCurve(filteredTrades, startingBalance);
  const dailyPnl = calculateDailyPnl(filteredTrades);
  const marketData = getTradesByMarket(filteredTrades);

  const engine = useMemo(() => new InsightEngine(filteredTrades), [filteredTrades]);
  const dq = engine.calculateDecisionQuality();
  const summary = engine.generateSummary();
  const patterns = engine.detectPatterns();
  const mistakes = engine.analyzeMistakes();
  const whatWorked = engine.analyzeWhatWorked();

  const currentBalance = startingBalance + metrics.totalPnl;
  const returnPct = startingBalance > 0 ? ((currentBalance - startingBalance) / startingBalance) * 100 : 0;
  const openTrades = filteredTrades.filter((t) => t.status === "open");
  const closedTrades = filteredTrades.filter((t) => t.status === "closed");
  const recentTrades = [...openTrades, ...closedTrades].slice(0, 6);

  const pieData = Object.entries(marketData).map(([name, data]) => ({ name: name.toUpperCase(), value: data.count }));

  // Today stats
  const today = format(new Date(), "yyyy-MM-dd");
  const todayTrades = trades.filter((t) => t.exitDate && format(new Date(t.exitDate), "yyyy-MM-dd") === today);
  const todayPnl = todayTrades.reduce((sum, t) => sum + num(t.pnl), 0);

  // This week stats
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekTrades = trades.filter((t) => t.exitDate && new Date(t.exitDate) >= weekStart);
  const weekPnl = weekTrades.reduce((sum, t) => sum + num(t.pnl), 0);

  // Best and worst trade
  const bestTrade = closedTrades.length > 0 ? closedTrades.reduce((best, t) => num(t.pnl) > num(best.pnl) ? t : best, closedTrades[0]) : null;
  const worstTrade = closedTrades.length > 0 ? closedTrades.reduce((worst, t) => num(t.pnl) < num(worst.pnl) ? t : worst, closedTrades[0]) : null;

  // Win/loss streaks
  const streakData = useMemo(() => {
    let current = 0;
    let type: "win" | "loss" | null = null;
    const sorted = [...closedTrades].sort((a, b) => new Date(b.exitDate || b.entryDate).getTime() - new Date(a.exitDate || a.entryDate).getTime());
    for (const t of sorted) {
      if (current === 0) {
        type = t.outcome === "win" ? "win" : t.outcome === "loss" ? "loss" : null;
        current = type ? 1 : 0;
      } else if ((type === "win" && t.outcome === "win") || (type === "loss" && t.outcome === "loss")) {
        current++;
      } else {
        break;
      }
    }
    return { streak: current, type };
  }, [closedTrades]);

  if (loading) {
    return (
      <PageShell title="Dashboard">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (<Card key={i}><div className="h-20 animate-pulse bg-dark-700 rounded" /></Card>))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Dashboard"
      subtitle={fmtDateFull(new Date())}
      actions={<Button variant="secondary" size="sm" onClick={() => exportDashboardPDF(filteredTrades, metrics, startingBalance).catch((e: any) => alert('PDF Error: ' + e.message))}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>Export PDF</Button>}
    >
      {/* Date Range Selector */}
      <div className="glass-card p-3 flex flex-wrap items-center gap-3">
        <span className="text-xs text-dark-400 font-medium uppercase tracking-wider">Period:</span>
        {["1W", "1M", "3M", "6M", "1Y", "ALL"].map((r) => (
          <button key={r} onClick={() => {
            setQuickRange(r);
            const end = new Date(); let start;
            if (r === "1W") start = subDays(end, 7);
            else if (r === "1M") start = subMonths(end, 1);
            else if (r === "3M") start = subMonths(end, 3);
            else if (r === "6M") start = subMonths(end, 6);
            else if (r === "1Y") start = subMonths(end, 12);
            else start = new Date(2020, 0, 1);
            setDateRange({ start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd") });
          }} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${quickRange === r ? "bg-accent-500 text-white" : "bg-dark-800 text-dark-400 hover:text-white"}`}>{r}</button>
        ))}
        <div className="h-4 w-px bg-white/10" />
        <Input type="date" value={dateRange.start} onChange={(e) => { setDateRange(p => ({ ...p, start: e.target.value })); setQuickRange(""); }} className="!py-1 text-xs !w-32" />
        <span className="text-dark-500">→</span>
        <Input type="date" value={dateRange.end} onChange={(e) => { setDateRange(p => ({ ...p, end: e.target.value })); setQuickRange(""); }} className="!py-1 text-xs !w-32" />
        <span className="text-xs text-dark-400">{filteredTrades.length} trades</span>
      </div>

      {/* Account Overview Strip */}
      <div className="glass-card p-5 gradient-border">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          <div>
            <p className="text-xs text-dark-400 uppercase tracking-wider">Account Balance</p>
            <p className="text-2xl font-bold text-white mt-1">{formatCurrency(currentBalance, currency)}</p>
            <p className={`text-xs font-medium mt-0.5 ${returnPct >= 0 ? "text-profit" : "text-loss"}`}>{formatPercent(returnPct)} all time</p>
          </div>
          <div>
            <p className="text-xs text-dark-400 uppercase tracking-wider">Today</p>
            <p className={`text-2xl font-bold mt-1 ${todayTrades.length === 0 ? "text-dark-300" : todayPnl >= 0 ? "text-profit" : "text-loss"}`}>
              {todayTrades.length === 0 ? "No trades" : formatCurrency(todayPnl, currency)}
            </p>
            {todayTrades.length > 0 && <p className="text-xs text-dark-400 mt-0.5">{todayTrades.length} trades</p>}
          </div>
          <div>
            <p className="text-xs text-dark-400 uppercase tracking-wider">This Week</p>
            <p className={`text-2xl font-bold mt-1 ${weekTrades.length === 0 ? "text-dark-300" : weekPnl >= 0 ? "text-profit" : "text-loss"}`}>
              {weekTrades.length === 0 ? "No trades" : formatCurrency(weekPnl, currency)}
            </p>
            {weekTrades.length > 0 && <p className="text-xs text-dark-400 mt-0.5">{weekTrades.length} trades</p>}
          </div>
          <div>
            <p className="text-xs text-dark-400 uppercase tracking-wider">Open Positions</p>
            <p className="text-2xl font-bold text-accent-400 mt-1">{openTrades.length}</p>
            {openTrades.length > 0 && <p className="text-xs text-dark-400 mt-0.5">{openTrades.map((t) => t.symbol).join(", ")}</p>}
          </div>
          <div>
            <p className="text-xs text-dark-400 uppercase tracking-wider">Current Streak</p>
            <p className={`text-2xl font-bold mt-1 ${streakData.type === "win" ? "text-profit" : streakData.type === "loss" ? "text-loss" : "text-dark-300"}`}>
              {streakData.streak > 0 ? `${streakData.streak} ${streakData.type === "win" ? "Wins" : "Losses"}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-dark-400 uppercase tracking-wider">Decision Score</p>
            <p className={`text-2xl font-bold mt-1 ${dq.overall >= 70 ? "text-profit" : dq.overall >= 40 ? "text-warn" : dq.overall > 0 ? "text-loss" : "text-dark-300"}`}>
              {dq.overall > 0 ? `${dq.overall}/100` : "—"}
            </p>
            {dq.overall > 0 && (
              <p className={`text-xs mt-0.5 ${dq.trend === "improving" ? "text-profit" : dq.trend === "declining" ? "text-loss" : "text-dark-400"}`}>
                {dq.trend === "improving" ? "↑ Improving" : dq.trend === "declining" ? "↓ Declining" : "→ Stable"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <KpiCard label="Total P&L" value={formatCurrency(metrics.totalPnl, currency)} positive={metrics.totalPnl >= 0} />
        <KpiCard label="Win Rate" value={`${metrics.winRate}%`} positive={metrics.winRate >= 50} />
        <KpiCard label="Profit Factor" value={metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2)} positive={metrics.profitFactor >= 1} />
        <KpiCard label="Expectancy" value={formatCurrency(metrics.expectancy, currency)} positive={metrics.expectancy >= 0} />
        <KpiCard label="Avg Win" value={formatCurrency(metrics.avgWin, currency)} positive />
        <KpiCard label="Avg Loss" value={formatCurrency(metrics.avgLoss, currency)} positive={false} />
        <KpiCard label="Max Drawdown" value={formatCurrency(metrics.maxDrawdown, currency)} positive={false} />
        <KpiCard label="Sharpe Ratio" value={metrics.sharpeRatio.toFixed(2)} positive={metrics.sharpeRatio >= 1} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Equity Curve</h3>
            <Link href="/analytics" className="text-xs text-accent-400 hover:text-accent-300">Full Analytics →</Link>
          </div>
          <EquityChart data={equityCurve} />
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Market Distribution</h3>
          <MarketPieChart data={pieData} />
          <div className="mt-4 space-y-2">
            {Object.entries(marketData).map(([market, data]) => (
              <div key={market} className="flex items-center justify-between text-xs">
                <span className="text-dark-300 uppercase">{market}</span>
                <div className="flex items-center gap-3">
                  <span className="text-dark-200">{data.count} · {data.winRate}% WR</span>
                  <span className={data.pnl >= 0 ? "text-profit" : "text-loss"}>{formatCurrency(data.pnl, currency)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Daily P&L */}
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Daily P&L</h3>
        <PnlBarChart data={dailyPnl} />
      </Card>

      {/* Insights + Stats + Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Insight + Patterns */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Quick Insights</h3>
            <Link href="/analytics" className="text-xs text-accent-400 hover:text-accent-300">All Insights →</Link>
          </div>
          {summary.hasEnoughData ? (
            <div className="space-y-3">
              <div className="p-3 bg-accent-500/10 border border-accent-500/20 rounded-lg">
                <p className="text-xs text-accent-400 font-medium uppercase mb-1">Top Insight</p>
                <p className="text-sm text-white">{summary.primaryInsight}</p>
              </div>
              {patterns.slice(0, 3).map((p, i) => (
                <div key={i} className={`p-3 rounded-lg border text-sm ${p.type === "winning" ? "bg-profit/5 border-profit/15" : "bg-loss/5 border-loss/15"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-white font-medium">{p.pattern}</p>
                    <span className={`text-xs shrink-0 ${p.type === "winning" ? "text-profit" : "text-loss"}`}>{p.financialImpact >= 0 ? "+" : ""}{formatCurrency(p.financialImpact, currency)}</span>
                  </div>
                  <p className="text-[11px] text-dark-400 mt-1">💡 {p.actionable}</p>
                </div>
              ))}
              {whatWorked.length > 0 && (
                <div>
                  <p className="text-xs text-dark-400 uppercase mb-2">Top winning habits</p>
                  <div className="flex flex-wrap gap-1">{whatWorked.slice(0, 4).map((w, i) => <Badge key={i} variant="profit" size="sm">{w.factor} ({w.occurrences}×)</Badge>)}</div>
                </div>
              )}
              {mistakes.length > 0 && (
                <div>
                  <p className="text-xs text-dark-400 uppercase mb-2">Top costly mistakes</p>
                  <div className="flex flex-wrap gap-1">{mistakes.slice(0, 4).map((m, i) => <Badge key={i} variant="loss" size="sm">{m.mistake} (-{formatCurrency(m.totalLoss)})</Badge>)}</div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-dark-400 text-sm">Log {3 - closedTrades.length} more trades to unlock insights.</p>
          )}
        </Card>

        {/* Performance Metrics */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Performance Breakdown</h3>
          <div className="space-y-3">
            {[
              ["Total Trades", `${metrics.totalTrades} (${metrics.winningTrades}W / ${metrics.losingTrades}L)`],
              ["Win Rate", `${metrics.winRate}%`],
              ["Avg Win / Avg Loss", `${formatCurrency(metrics.avgWin)} / ${formatCurrency(metrics.avgLoss)}`],
              ["Best Trade", bestTrade ? `${bestTrade.symbol} ${formatCurrency(num(bestTrade.pnl))}` : "—"],
              ["Worst Trade", worstTrade ? `${worstTrade.symbol} ${formatCurrency(num(worstTrade.pnl))}` : "—"],
              ["Avg R:R", metrics.avgRiskReward.toFixed(2)],
              ["Max Win Streak", `${metrics.maxConsecutiveWins}`],
              ["Max Loss Streak", `${metrics.maxConsecutiveLosses}`],
              ["Avg Hold Time", `${metrics.avgHoldingTime.toFixed(1)} hours`],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between text-sm">
                <span className="text-dark-400">{String(label)}</span>
                <span className="text-dark-100 font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Trades */}
        <Card padding={false}>
          <div className="p-5 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              {openTrades.length > 0 ? `Open Positions (${openTrades.length})` : "Recent Trades"}
            </h3>
            <Link href="/trades" className="text-xs text-accent-400 hover:text-accent-300">All Trades →</Link>
          </div>
          <div className="divide-y divide-white/5">
            {(openTrades.length > 0 ? [...openTrades, ...recentTrades.slice(0, 4)] : recentTrades).length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-dark-400">No trades yet.</div>
            ) : (
              (openTrades.length > 0 ? [...openTrades, ...recentTrades.slice(0, 4)] : recentTrades).map((t) => (
                <div key={t.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge variant={t.direction === "long" ? "profit" : "loss"}>
                      {t.direction === "long" ? "BUY" : "SELL"}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-white">{t.symbol}</p>
                      <p className="text-xs text-dark-400">
                        {fmtDateTime(t.entryDate)}
                        {t.strategy && ` · ${t.strategy}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {t.pnl ? (
                      <>
                        <p className={`text-sm font-semibold ${num(t.pnl) >= 0 ? "text-profit" : "text-loss"}`}>
                          {formatCurrency(num(t.pnl), currency)}
                        </p>
                        {t.rMultiple && <p className={`text-[10px] ${num(t.rMultiple) >= 0 ? "text-profit" : "text-loss"}`}>{num(t.rMultiple) >= 0 ? "+" : ""}{num(t.rMultiple).toFixed(2)}R</p>}
                      </>
                    ) : (
                      <Badge variant="accent">OPEN</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

function KpiCard({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="bg-dark-800/60 rounded-xl p-3 text-center border border-white/5">
      <p className={`text-lg font-bold ${positive ? "text-profit" : "text-loss"}`}>{value}</p>
      <p className="text-[10px] text-dark-400 uppercase mt-0.5">{label}</p>
    </div>
  );
}

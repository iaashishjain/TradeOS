"use client";

import { useMemo, useState } from "react";
import { Card, Badge, Button, Modal } from "@/components/ui";
import { formatCurrency, formatPrice, num, fmtDate, fmtTime, fmtDateTime, fmtDateFull, fmtDateTimeFull } from "@/lib/calculations";
import { format } from "date-fns";
import type { Trade } from "@/db/schema";

interface JournalViewerProps {
  trades: Trade[];
  startDate: string;
  endDate: string;
  onClose?: () => void;
  title?: string;
}

export function JournalViewer({ trades, startDate, endDate, onClose, title }: JournalViewerProps) {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [imageModal, setImageModal] = useState<{ url: string; title: string } | null>(null);

  const filteredTrades = useMemo(() => {
    return trades
      .filter((t) => {
        const date = new Date(t.entryDate);
        return date >= new Date(startDate) && date <= new Date(endDate + "T23:59:59");
      })
      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  }, [trades, startDate, endDate]);

  const summary = useMemo(() => {
    const closed = filteredTrades.filter((t) => t.status === "closed");
    const wins = closed.filter((t) => t.outcome === "win");
    const losses = closed.filter((t) => t.outcome === "loss");
    const totalPnl = closed.reduce((sum, t) => sum + num(t.pnl), 0);
    const totalPips = closed.reduce((sum, t) => sum + num(t.pipsCaptured), 0);

    // Collect all what worked and mistakes
    const allWhatWorked: Record<string, number> = {};
    const allMistakes: Record<string, number> = {};
    const strategies: Record<string, { wins: number; total: number; pnl: number }> = {};
    const setups: Record<string, { wins: number; total: number; pnl: number }> = {};

    for (const t of closed) {
      // What worked
      const worked = (t.whatWorked as string[]) || [];
      for (const w of worked) {
        allWhatWorked[w] = (allWhatWorked[w] || 0) + 1;
      }

      // Mistakes
      const mistakes = (t.mistakes as string[]) || [];
      for (const m of mistakes) {
        allMistakes[m] = (allMistakes[m] || 0) + 1;
      }

      // Strategies
      if (t.strategy) {
        if (!strategies[t.strategy]) strategies[t.strategy] = { wins: 0, total: 0, pnl: 0 };
        strategies[t.strategy].total++;
        strategies[t.strategy].pnl += num(t.pnl);
        if (t.outcome === "win") strategies[t.strategy].wins++;
      }

      // Setups
      if (t.setup) {
        if (!setups[t.setup]) setups[t.setup] = { wins: 0, total: 0, pnl: 0 };
        setups[t.setup].total++;
        setups[t.setup].pnl += num(t.pnl);
        if (t.outcome === "win") setups[t.setup].wins++;
      }
    }

    return {
      totalTrades: filteredTrades.length,
      closedTrades: closed.length,
      wins: wins.length,
      losses: losses.length,
      winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
      totalPnl,
      totalPips,
      avgPnl: closed.length > 0 ? totalPnl / closed.length : 0,
      whatWorked: Object.entries(allWhatWorked).sort((a, b) => b[1] - a[1]),
      mistakes: Object.entries(allMistakes).sort((a, b) => b[1] - a[1]),
      strategies: Object.entries(strategies)
        .map(([name, data]) => ({
          name,
          ...data,
          winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
        }))
        .sort((a, b) => b.pnl - a.pnl),
      setups: Object.entries(setups)
        .map(([name, data]) => ({
          name,
          ...data,
          winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
        }))
        .sort((a, b) => b.pnl - a.pnl),
    };
  }, [filteredTrades]);

  // Group trades by date
  const tradesByDate = useMemo(() => {
    const groups = new Map<string, Trade[]>();
    for (const t of filteredTrades) {
      const dateKey = format(new Date(t.entryDate), "yyyy-MM-dd");
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(t);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTrades]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            {title || `Journal: ${fmtDate(startDate)} - ${fmtDate(endDate)}`}
          </h2>
          <p className="text-sm text-dark-300 mt-1">
            {summary.totalTrades} trades · {summary.closedTrades} closed
          </p>
        </div>
        {onClose && (
          <Button variant="secondary" onClick={onClose}>Close</Button>
        )}
      </div>

      {/* Period Summary */}
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Period Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="text-center p-3 bg-dark-800 rounded-lg">
            <p className={`text-2xl font-bold ${summary.totalPnl >= 0 ? "text-profit" : "text-loss"}`}>
              {formatCurrency(summary.totalPnl)}
            </p>
            <p className="text-xs text-dark-400 mt-1">Total P&L</p>
          </div>
          <div className="text-center p-3 bg-dark-800 rounded-lg">
            <p className={`text-2xl font-bold ${summary.winRate >= 50 ? "text-profit" : "text-loss"}`}>
              {summary.winRate.toFixed(1)}%
            </p>
            <p className="text-xs text-dark-400 mt-1">Win Rate</p>
          </div>
          <div className="text-center p-3 bg-dark-800 rounded-lg">
            <p className="text-2xl font-bold text-profit">{summary.wins}</p>
            <p className="text-xs text-dark-400 mt-1">Winning Trades</p>
          </div>
          <div className="text-center p-3 bg-dark-800 rounded-lg">
            <p className="text-2xl font-bold text-loss">{summary.losses}</p>
            <p className="text-xs text-dark-400 mt-1">Losing Trades</p>
          </div>
          <div className="text-center p-3 bg-dark-800 rounded-lg">
            <p className={`text-2xl font-bold ${summary.totalPips >= 0 ? "text-profit" : "text-loss"}`}>
              {summary.totalPips.toFixed(1)}
            </p>
            <p className="text-xs text-dark-400 mt-1">Total Pips</p>
          </div>
          <div className="text-center p-3 bg-dark-800 rounded-lg">
            <p className={`text-2xl font-bold ${summary.avgPnl >= 0 ? "text-profit" : "text-loss"}`}>
              {formatCurrency(summary.avgPnl)}
            </p>
            <p className="text-xs text-dark-400 mt-1">Avg per Trade</p>
          </div>
        </div>
      </Card>

      {/* What Worked vs Mistakes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-profit" />
            What Worked (Do&apos;s)
          </h3>
          {summary.whatWorked.length === 0 ? (
            <p className="text-dark-400 text-sm">No patterns recorded yet. Tag your winning trades!</p>
          ) : (
            <div className="space-y-2">
              {summary.whatWorked.map(([factor, count]) => (
                <div key={factor} className="flex items-center justify-between p-2 bg-profit/5 border border-profit/20 rounded-lg">
                  <span className="text-sm text-white">{factor}</span>
                  <Badge variant="profit">{count}x</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-loss" />
            Mistakes (Don&apos;ts)
          </h3>
          {summary.mistakes.length === 0 ? (
            <p className="text-dark-400 text-sm">No mistakes recorded. Tag your losing trades to learn!</p>
          ) : (
            <div className="space-y-2">
              {summary.mistakes.map(([mistake, count]) => (
                <div key={mistake} className="flex items-center justify-between p-2 bg-loss/5 border border-loss/20 rounded-lg">
                  <span className="text-sm text-white">{mistake}</span>
                  <Badge variant="loss">{count}x</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Strategy & Setup Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Strategy Performance</h3>
          {summary.strategies.length === 0 ? (
            <p className="text-dark-400 text-sm">No strategies recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {summary.strategies.map((s) => (
                <div key={s.name} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-dark-400">{s.total} trades · {s.winRate.toFixed(0)}% WR</p>
                  </div>
                  <p className={`text-sm font-semibold ${s.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                    {formatCurrency(s.pnl)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Setup Performance</h3>
          {summary.setups.length === 0 ? (
            <p className="text-dark-400 text-sm">No setups recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {summary.setups.map((s) => (
                <div key={s.name} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-dark-400">{s.total} trades · {s.winRate.toFixed(0)}% WR</p>
                  </div>
                  <p className={`text-sm font-semibold ${s.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                    {formatCurrency(s.pnl)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Daily Breakdown */}
      <Card padding={false}>
        <div className="p-5 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white">Daily Trade Journal</h3>
        </div>
        
        {tradesByDate.length === 0 ? (
          <div className="p-8 text-center text-dark-400">
            No trades found in this period.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {tradesByDate.map(([dateStr, dayTrades]) => {
              const dayPnl = dayTrades.filter((t) => t.status === "closed").reduce((sum, t) => sum + num(t.pnl), 0);
              const dayWins = dayTrades.filter((t) => t.outcome === "win").length;
              const dayLosses = dayTrades.filter((t) => t.outcome === "loss").length;
              
              return (
                <div key={dateStr} className="p-5">
                  {/* Date Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-base font-semibold text-white">
                        {fmtDateFull(dateStr)}
                      </h4>
                      <p className="text-xs text-dark-400 mt-0.5">
                        {dayTrades.length} trades · {dayWins} wins · {dayLosses} losses
                      </p>
                    </div>
                    <div className={`text-lg font-bold ${dayPnl >= 0 ? "text-profit" : "text-loss"}`}>
                      {formatCurrency(dayPnl)}
                    </div>
                  </div>

                  {/* Trades */}
                  <div className="space-y-3">
                    {dayTrades.map((trade) => (
                      <div
                        key={trade.id}
                        className="p-4 bg-dark-800/50 rounded-lg hover:bg-dark-800 transition-colors cursor-pointer"
                        onClick={() => setSelectedTrade(trade)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge variant={trade.direction === "long" ? "profit" : "loss"}>
                              {trade.direction === "long" ? "BUY" : "SELL"}
                            </Badge>
                            <div>
                              <p className="font-semibold text-white">{trade.symbol}</p>
                              <p className="text-xs text-dark-400">
                                {fmtTime(trade.entryDate)}
                                {trade.strategy && ` · ${trade.strategy}`}
                                {trade.setup && ` · ${trade.setup}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {trade.pnl ? (
                              <>
                                <p className={`font-semibold ${num(trade.pnl) >= 0 ? "text-profit" : "text-loss"}`}>
                                  {formatCurrency(num(trade.pnl))}
                                </p>
                                {trade.pipsCaptured && (
                                  <p className={`text-xs ${num(trade.pipsCaptured) >= 0 ? "text-profit" : "text-loss"}`}>
                                    {num(trade.pipsCaptured) >= 0 ? "+" : ""}{num(trade.pipsCaptured).toFixed(1)} pips
                                  </p>
                                )}
                              </>
                            ) : (
                              <Badge variant="warn">OPEN</Badge>
                            )}
                          </div>
                        </div>

                        {/* Screenshots Preview */}
                        {(trade.screenshotBefore || trade.screenshotAfter) && (
                          <div className="flex gap-2 mb-3">
                            {trade.screenshotBefore && (
                              <img
                                src={trade.screenshotBefore}
                                alt="Before"
                                className="h-16 w-24 object-cover rounded border border-white/10 cursor-pointer hover:border-accent-500/50 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setImageModal({ url: trade.screenshotBefore!, title: "Before Entry" });
                                }}
                              />
                            )}
                            {trade.screenshotAfter && (
                              <img
                                src={trade.screenshotAfter}
                                alt="After"
                                className="h-16 w-24 object-cover rounded border border-white/10 cursor-pointer hover:border-accent-500/50 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setImageModal({ url: trade.screenshotAfter!, title: "After Exit" });
                                }}
                              />
                            )}
                          </div>
                        )}

                        {/* What Worked / Mistakes Tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {((trade.whatWorked as string[]) || []).map((w, i) => (
                            <Badge key={`w-${i}`} variant="profit" size="sm">{w}</Badge>
                          ))}
                          {((trade.mistakes as string[]) || []).map((m, i) => (
                            <Badge key={`m-${i}`} variant="loss" size="sm">{m}</Badge>
                          ))}
                        </div>

                        {/* Notes Preview */}
                        {trade.notes && (
                          <p className="text-xs text-dark-300 mt-2 line-clamp-2">{trade.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Trade Detail Modal */}
      <Modal
        open={!!selectedTrade}
        onClose={() => setSelectedTrade(null)}
        title="Trade Details"
        wide
      >
        {selectedTrade && <TradeDetailView trade={selectedTrade} onImageClick={(url, title) => setImageModal({ url, title })} />}
      </Modal>

      {/* Image Modal */}
      <Modal
        open={!!imageModal}
        onClose={() => setImageModal(null)}
        title={imageModal?.title || "Screenshot"}
        wide
      >
        {imageModal && (
          <img
            src={imageModal.url}
            alt={imageModal.title}
            className="w-full rounded-lg"
          />
        )}
      </Modal>
    </div>
  );
}

function TradeDetailView({ trade, onImageClick }: { trade: Trade; onImageClick: (url: string, title: string) => void }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-white">{trade.symbol}</span>
          <Badge variant={trade.direction === "long" ? "profit" : "loss"}>
            {trade.direction === "long" ? "BUY" : "SELL"}
          </Badge>
          <Badge variant={trade.outcome === "win" ? "profit" : trade.outcome === "loss" ? "loss" : "default"}>
            {trade.outcome?.toUpperCase() || trade.status.toUpperCase()}
          </Badge>
        </div>
        <div className="text-right">
          {trade.pnl && (
            <p className={`text-2xl font-bold ${num(trade.pnl) >= 0 ? "text-profit" : "text-loss"}`}>
              {formatCurrency(num(trade.pnl))}
            </p>
          )}
          {trade.rMultiple && (
            <p className={`text-sm ${num(trade.rMultiple) >= 0 ? "text-profit" : "text-loss"}`}>
              {num(trade.rMultiple) >= 0 ? "+" : ""}{num(trade.rMultiple).toFixed(2)}R
            </p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-dark-800 rounded-lg p-3">
          <p className="text-xs text-dark-400">Entry Price</p>
          <p className="text-sm font-mono text-white">{formatPrice(trade.entryPrice)}</p>
        </div>
        <div className="bg-dark-800 rounded-lg p-3">
          <p className="text-xs text-dark-400">Exit Price</p>
          <p className="text-sm font-mono text-white">{formatPrice(trade.exitPrice)}</p>
        </div>
        <div className="bg-dark-800 rounded-lg p-3">
          <p className="text-xs text-dark-400">Stop Loss</p>
          <p className="text-sm font-mono text-white">{formatPrice(trade.stopLoss)}</p>
        </div>
        <div className="bg-dark-800 rounded-lg p-3">
          <p className="text-xs text-dark-400">Take Profit</p>
          <p className="text-sm font-mono text-white">{formatPrice(trade.takeProfit)}</p>
        </div>
        <div className="bg-dark-800 rounded-lg p-3">
          <p className="text-xs text-dark-400">Pips</p>
          <p className={`text-sm font-mono ${num(trade.pipsCaptured) >= 0 ? "text-profit" : "text-loss"}`}>
            {trade.pipsCaptured ? `${num(trade.pipsCaptured) >= 0 ? "+" : ""}${trade.pipsCaptured}` : "—"}
          </p>
        </div>
        <div className="bg-dark-800 rounded-lg p-3">
          <p className="text-xs text-dark-400">Risk:Reward</p>
          <p className="text-sm font-mono text-white">{trade.riskRewardRatio || "—"}</p>
        </div>
        <div className="bg-dark-800 rounded-lg p-3">
          <p className="text-xs text-dark-400">Position Size</p>
          <p className="text-sm font-mono text-white">{trade.positionSize}</p>
        </div>
        <div className="bg-dark-800 rounded-lg p-3">
          <p className="text-xs text-dark-400">Risk Amount</p>
          <p className="text-sm font-mono text-white">{trade.riskAmount ? formatCurrency(num(trade.riskAmount)) : "—"}</p>
        </div>
      </div>

      {/* Screenshots */}
      {(trade.screenshotBefore || trade.screenshotAfter) && (
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Screenshots</h4>
          <div className="grid grid-cols-2 gap-4">
            {trade.screenshotBefore && (
              <div>
                <p className="text-xs text-dark-400 mb-2">Before Entry</p>
                <img
                  src={trade.screenshotBefore}
                  alt="Before"
                  className="w-full rounded-lg border border-white/10 cursor-pointer hover:border-accent-500/50 transition-colors"
                  onClick={() => onImageClick(trade.screenshotBefore!, "Before Entry")}
                />
              </div>
            )}
            {trade.screenshotAfter && (
              <div>
                <p className="text-xs text-dark-400 mb-2">After Exit</p>
                <img
                  src={trade.screenshotAfter}
                  alt="After"
                  className="w-full rounded-lg border border-white/10 cursor-pointer hover:border-accent-500/50 transition-colors"
                  onClick={() => onImageClick(trade.screenshotAfter!, "After Exit")}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Context */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {trade.strategy && (
          <div><span className="text-dark-400">Strategy:</span> <span className="text-white ml-1">{trade.strategy}</span></div>
        )}
        {trade.setup && (
          <div><span className="text-dark-400">Setup:</span> <span className="text-white ml-1">{trade.setup}</span></div>
        )}
        {trade.session && (
          <div><span className="text-dark-400">Session:</span> <span className="text-white ml-1">{trade.session}</span></div>
        )}
        {trade.timeframe && (
          <div><span className="text-dark-400">Timeframe:</span> <span className="text-white ml-1">{trade.timeframe}</span></div>
        )}
      </div>

      {/* What Worked / Mistakes */}
      <div className="grid grid-cols-2 gap-4">
        {((trade.whatWorked as string[]) || []).length > 0 && (
          <div>
            <p className="text-xs text-dark-400 uppercase mb-2">What Worked</p>
            <div className="flex flex-wrap gap-1.5">
              {((trade.whatWorked as string[]) || []).map((w, i) => (
                <Badge key={i} variant="profit">{w}</Badge>
              ))}
            </div>
          </div>
        )}
        {((trade.mistakes as string[]) || []).length > 0 && (
          <div>
            <p className="text-xs text-dark-400 uppercase mb-2">Mistakes</p>
            <div className="flex flex-wrap gap-1.5">
              {((trade.mistakes as string[]) || []).map((m, i) => (
                <Badge key={i} variant="loss">{m}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reflection */}
      {(trade.whatIDid || trade.whatIShouldHaveDone) && (
        <div className="grid grid-cols-2 gap-4">
          {trade.whatIDid && (
            <div className="p-3 bg-dark-800 rounded-lg">
              <p className="text-xs text-dark-400 uppercase mb-1">What I Did</p>
              <p className="text-sm text-dark-200">{trade.whatIDid}</p>
            </div>
          )}
          {trade.whatIShouldHaveDone && (
            <div className="p-3 bg-dark-800 rounded-lg">
              <p className="text-xs text-dark-400 uppercase mb-1">What I Should Have Done</p>
              <p className="text-sm text-dark-200">{trade.whatIShouldHaveDone}</p>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {trade.notes && (
        <div>
          <p className="text-xs text-dark-400 uppercase mb-1">Notes</p>
          <p className="text-sm text-dark-200 whitespace-pre-wrap">{trade.notes}</p>
        </div>
      )}

      {/* Timestamps */}
      <div className="pt-4 border-t border-white/5 text-xs text-dark-400">
        <p>Entry: {fmtDateTimeFull(trade.entryDate)}</p>
        {trade.exitDate && <p>Exit: {fmtDateTimeFull(trade.exitDate)}</p>}
      </div>
    </div>
  );
}

// Interactive Calendar Heatmap
export function InteractiveCalendarHeatmap({
  data,
  year,
  month,
  onDateClick,
  onMonthChange,
}: {
  data: { date: string; pnl: number; trades: number; winRate: number }[];
  year: number;
  month: number;
  onDateClick: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
}) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startPadding = firstDay.getDay();
  const monthName = format(firstDay, "MMMM yyyy");

  const maxPnl = Math.max(...data.map((d) => Math.abs(d.pnl)), 1);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const dataMap = new Map(data.map((d) => [d.date, d]));

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            const newMonth = month === 0 ? 11 : month - 1;
            const newYear = month === 0 ? year - 1 : year;
            onMonthChange(newYear, newMonth);
          }}
          className="p-2 rounded-lg hover:bg-white/10 text-dark-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h3 className="text-lg font-semibold text-white">{monthName}</h3>
        <button
          onClick={() => {
            const newMonth = month === 11 ? 0 : month + 1;
            const newYear = month === 11 ? year + 1 : year;
            onMonthChange(newYear, newMonth);
          }}
          className="p-2 rounded-lg hover:bg-white/10 text-dark-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {dayNames.map((d) => (
          <div key={d} className="text-xs text-dark-400 py-2">{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPadding }, (_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayData = dataMap.get(dateStr);
          const intensity = dayData ? dayData.pnl / maxPnl : 0;
          
          let bgClass = "bg-dark-800/50";
          if (dayData) {
            if (intensity > 0.5) bgClass = "bg-profit hover:bg-profit/80";
            else if (intensity > 0.2) bgClass = "bg-profit/60 hover:bg-profit/50";
            else if (intensity > 0) bgClass = "bg-profit/30 hover:bg-profit/40";
            else if (intensity < -0.5) bgClass = "bg-loss hover:bg-loss/80";
            else if (intensity < -0.2) bgClass = "bg-loss/60 hover:bg-loss/50";
            else if (intensity < 0) bgClass = "bg-loss/30 hover:bg-loss/40";
            else bgClass = "bg-dark-700 hover:bg-dark-600";
          }

          const isToday = dateStr === format(new Date(), "yyyy-MM-dd");

          return (
            <button
              key={day}
              onClick={() => dayData && onDateClick(dateStr)}
              disabled={!dayData}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative ${bgClass} ${
                dayData ? "cursor-pointer" : "cursor-default opacity-50"
              } ${isToday ? "ring-2 ring-accent-500" : ""}`}
              title={dayData ? `${dateStr}: ${dayData.trades} trades, ${formatCurrency(dayData.pnl)}` : dateStr}
            >
              <span className={`font-medium ${dayData ? "text-white" : "text-dark-500"}`}>{day}</span>
              {dayData && (
                <span className="text-[10px] text-white/80">{dayData.trades}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-2 text-xs text-dark-400">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-loss" /> Big Loss
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-loss/30" /> Small Loss
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-dark-700" /> Breakeven
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-profit/30" /> Small Profit
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-profit" /> Big Profit
        </span>
      </div>
    </div>
  );
}

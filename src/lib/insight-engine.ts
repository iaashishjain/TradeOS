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

function formatCurrencySimple(v: number): string {
  const sign = v < 0 ? "-" : "+";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

// ── Types ──
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
  avgRMultiple: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  maxDrawdown: number;
  avgHoldingTime: number;
  avgPips: number;
  sharpeRatio: number;
}

export interface DimensionPerformance {
  name: string;
  trades: number;
  wins: number;
  winRate: number;
  pnl: number;
  avgPnl: number;
  avgR: number;
  avgPips: number;
  profitFactor: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  recommendation: "keep" | "improve" | "avoid";
}

export interface PatternInsight {
  type: "winning" | "losing" | "neutral";
  pattern: string;
  description: string;
  trades: number;
  winRate: number;
  avgPnl: number;
  confidence: number;
  actionable: string;
  financialImpact: number;
}

export interface MistakeAnalysis {
  mistake: string;
  occurrences: number;
  totalLoss: number;
  avgLoss: number;
  percentOfLosses: number;
  recommendation: string;
}

export interface ConfluencePattern {
  factors: string[];
  trades: number;
  winRate: number;
  avgPnl: number;
  avgR: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
}

export interface DecisionQualityScore {
  overall: number;
  components: {
    planAdherence: number;
    riskManagement: number;
    entryQuality: number;
    exitQuality: number;
    emotionalControl: number;
  };
  trend: "improving" | "stable" | "declining";
  recentScore: number;
}

export interface PeriodReview {
  period: string;
  startDate: string;
  endDate: string;
  trades: number;
  pnl: number;
  winRate: number;
  avgR: number;
  bestDay: { date: string; pnl: number } | null;
  worstDay: { date: string; pnl: number } | null;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  deteriorations: string[];
  topMistakes: string[];
  highProbabilityConditions: string[];
  singleBiggestImprovement: string;
  decisionQuality: number;
}

export interface TradeComparison {
  tradeA: Trade;
  tradeB: Trade;
  similarities: string[];
  differences: string[];
  keyFactors: string[];
  lesson: string;
}

export interface CalendarDay {
  date: string;
  trades: number;
  pnl: number;
  winRate: number;
  intensity: number; // -1 to 1 for heatmap
}

export interface InsightSummary {
  hasEnoughData: boolean;
  minTradesRequired: number;
  currentTrades: number;
  dataQualityScore: number;
  primaryInsight: string;
  keepDoing: string[];
  stopDoing: string[];
  improve: string[];
}

// ── Main Insight Engine Class ──
export class InsightEngine {
  private trades: Trade[];
  private closedTrades: Trade[];  // Only taken trades (not missed)
  private allClosed: Trade[];     // All closed including missed
  private wins: Trade[];
  private losses: Trade[];
  private missedTrades: Trade[];

  constructor(trades: Trade[]) {
    this.trades = trades;
    this.allClosed = trades.filter((t) => t.status === "closed");
    this.closedTrades = this.allClosed.filter((t) => !t.isMissed);  // Exclude missed from stats
    this.missedTrades = this.allClosed.filter((t) => t.isMissed);
    this.wins = this.closedTrades.filter((t) => t.outcome === "win");
    this.losses = this.closedTrades.filter((t) => t.outcome === "loss");
  }

  // ── Data Quality Check ──
  hasEnoughData(minTrades = 3): boolean {
    return this.closedTrades.length >= minTrades;
  }

  getDataQualityScore(): number {
    if (this.closedTrades.length === 0) return 0;
    
    let score = 0;
    const checks = [
      this.closedTrades.length >= 10, // Minimum trades
      this.closedTrades.length >= 30, // Better sample
      this.closedTrades.some((t) => t.strategy), // Has strategies
      this.closedTrades.some((t) => t.setup), // Has setups
      this.closedTrades.some((t) => t.stopLoss), // Has stop losses
      this.closedTrades.some((t) => (t.whatWorked as string[])?.length > 0), // Has what worked
      this.closedTrades.some((t) => (t.mistakes as string[])?.length > 0), // Has mistakes
      this.closedTrades.some((t) => t.screenshotBefore || t.screenshotAfter), // Has screenshots
    ];
    
    score = checks.filter(Boolean).length / checks.length * 100;
    return round(score);
  }

  // ── Core Metrics ──
  calculateMetrics(): PerformanceMetrics {
    const total = this.closedTrades.length;
    if (total === 0) {
      return this.emptyMetrics();
    }

    const pnls = this.closedTrades.map((t) => num(t.pnl));
    const winPnls = this.wins.map((t) => num(t.pnl));
    const lossPnls = this.losses.map((t) => num(t.pnl));

    const totalPnl = pnls.reduce((a, b) => a + b, 0);
    const totalWinPnl = winPnls.reduce((a, b) => a + b, 0);
    const totalLossPnl = lossPnls.reduce((a, b) => a + b, 0);

    const winRate = (this.wins.length / total) * 100;
    const avgWin = this.wins.length > 0 ? totalWinPnl / this.wins.length : 0;
    const avgLoss = this.losses.length > 0 ? Math.abs(totalLossPnl) / this.losses.length : 0;
    const largestWin = winPnls.length > 0 ? Math.max(...winPnls) : 0;
    const largestLoss = lossPnls.length > 0 ? Math.abs(Math.min(...lossPnls)) : 0;
    const profitFactor = totalLossPnl !== 0 ? Math.abs(totalWinPnl / totalLossPnl) : totalWinPnl > 0 ? Infinity : 0;
    const expectancy = totalPnl / total;

    const rrValues = this.closedTrades.map((t) => num(t.riskRewardRatio)).filter((r) => r > 0);
    const avgRiskReward = rrValues.length > 0 ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : 0;

    const rValues = this.closedTrades.map((t) => num(t.rMultiple)).filter((r) => r !== 0);
    const avgRMultiple = rValues.length > 0 ? rValues.reduce((a, b) => a + b, 0) / rValues.length : 0;

    const pipsValues = this.closedTrades.map((t) => num(t.pipsCaptured)).filter((p) => p !== 0);
    const avgPips = pipsValues.length > 0 ? pipsValues.reduce((a, b) => a + b, 0) / pipsValues.length : 0;

    // Consecutive wins/losses
    const { maxWins, maxLosses } = this.calculateConsecutive();

    // Max drawdown
    const maxDrawdown = this.calculateMaxDrawdown();

    // Avg holding time
    const avgHoldingTime = this.calculateAvgHoldingTime();

    // Sharpe ratio
    const avgPnl = totalPnl / total;
    const variance = pnls.reduce((sum, p) => sum + Math.pow(p - avgPnl, 2), 0) / total;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgPnl / stdDev) * Math.sqrt(252) : 0;

    return {
      totalTrades: total,
      winningTrades: this.wins.length,
      losingTrades: this.losses.length,
      breakevenTrades: this.closedTrades.filter((t) => t.outcome === "breakeven").length,
      winRate: round(winRate),
      totalPnl: round(totalPnl),
      avgWin: round(avgWin),
      avgLoss: round(avgLoss),
      largestWin: round(largestWin),
      largestLoss: round(largestLoss),
      profitFactor: profitFactor === Infinity ? Infinity : round(profitFactor),
      expectancy: round(expectancy),
      avgRiskReward: round(avgRiskReward),
      avgRMultiple: round(avgRMultiple),
      maxConsecutiveWins: maxWins,
      maxConsecutiveLosses: maxLosses,
      maxDrawdown: round(maxDrawdown),
      avgHoldingTime: round(avgHoldingTime),
      avgPips: round(avgPips),
      sharpeRatio: round(sharpeRatio),
    };
  }

  private emptyMetrics(): PerformanceMetrics {
    return {
      totalTrades: 0, winningTrades: 0, losingTrades: 0, breakevenTrades: 0,
      winRate: 0, totalPnl: 0, avgWin: 0, avgLoss: 0, largestWin: 0, largestLoss: 0,
      profitFactor: 0, expectancy: 0, avgRiskReward: 0, avgRMultiple: 0,
      maxConsecutiveWins: 0, maxConsecutiveLosses: 0, maxDrawdown: 0,
      avgHoldingTime: 0, avgPips: 0, sharpeRatio: 0,
    };
  }

  private calculateConsecutive(): { maxWins: number; maxLosses: number } {
    let maxWins = 0, maxLosses = 0, currentWins = 0, currentLosses = 0;
    const sorted = [...this.closedTrades].sort(
      (a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime()
    );
    for (const t of sorted) {
      if (t.outcome === "win") {
        currentWins++;
        currentLosses = 0;
        maxWins = Math.max(maxWins, currentWins);
      } else if (t.outcome === "loss") {
        currentLosses++;
        currentWins = 0;
        maxLosses = Math.max(maxLosses, currentLosses);
      } else {
        currentWins = 0;
        currentLosses = 0;
      }
    }
    return { maxWins, maxLosses };
  }

  private calculateMaxDrawdown(): number {
    const sorted = [...this.closedTrades].sort(
      (a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime()
    );
    let peak = 0, maxDrawdown = 0, cumulative = 0;
    for (const t of sorted) {
      cumulative += num(t.pnl);
      if (cumulative > peak) peak = cumulative;
      const dd = peak - cumulative;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
    return maxDrawdown;
  }

  private calculateAvgHoldingTime(): number {
    const times = this.closedTrades
      .filter((t) => t.exitDate && t.entryDate)
      .map((t) => (new Date(t.exitDate!).getTime() - new Date(t.entryDate).getTime()) / (1000 * 60 * 60));
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  // ── Dimension Analysis ──
  analyzeDimension(dimension: "symbol" | "strategy" | "setup" | "session" | "timeframe" | "direction" | "marketType"): DimensionPerformance[] {
    const groups = new Map<string, Trade[]>();
    
    for (const t of this.closedTrades) {
      const key = String(t[dimension] || "Unknown");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }

    return [...groups.entries()]
      .map(([name, trades]) => this.calculateDimensionPerformance(name, trades))
      .sort((a, b) => b.pnl - a.pnl);
  }

  private calculateDimensionPerformance(name: string, trades: Trade[]): DimensionPerformance {
    const wins = trades.filter((t) => t.outcome === "win");
    const losses = trades.filter((t) => t.outcome === "loss");
    const pnl = trades.reduce((sum, t) => sum + num(t.pnl), 0);
    const winPnl = wins.reduce((sum, t) => sum + num(t.pnl), 0);
    const lossPnl = losses.reduce((sum, t) => sum + num(t.pnl), 0);
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
    const avgPnl = trades.length > 0 ? pnl / trades.length : 0;
    const rValues = trades.map((t) => num(t.rMultiple)).filter((r) => r !== 0);
    const avgR = rValues.length > 0 ? rValues.reduce((a, b) => a + b, 0) / rValues.length : 0;
    const pipsValues = trades.map((t) => num(t.pipsCaptured)).filter((p) => p !== 0);
    const avgPips = pipsValues.length > 0 ? pipsValues.reduce((a, b) => a + b, 0) / pipsValues.length : 0;
    const profitFactor = lossPnl !== 0 ? Math.abs(winPnl / lossPnl) : winPnl > 0 ? Infinity : 0;

    const grade = this.calculateGrade(winRate, profitFactor, avgR, trades.length);
    const recommendation = grade === "A+" || grade === "A" ? "keep" : grade === "F" || grade === "D" ? "avoid" : "improve";

    return {
      name,
      trades: trades.length,
      wins: wins.length,
      winRate: round(winRate),
      pnl: round(pnl),
      avgPnl: round(avgPnl),
      avgR: round(avgR),
      avgPips: round(avgPips),
      profitFactor: profitFactor === Infinity ? Infinity : round(profitFactor),
      grade,
      recommendation,
    };
  }

  private calculateGrade(winRate: number, pf: number, avgR: number, sampleSize: number): "A+" | "A" | "B" | "C" | "D" | "F" {
    if (sampleSize < 5) return "C"; // Insufficient data
    
    let score = 0;
    if (winRate >= 60) score += 3;
    else if (winRate >= 50) score += 2;
    else if (winRate >= 40) score += 1;
    
    if (pf >= 2) score += 3;
    else if (pf >= 1.5) score += 2;
    else if (pf >= 1) score += 1;
    
    if (avgR >= 1.5) score += 3;
    else if (avgR >= 1) score += 2;
    else if (avgR >= 0.5) score += 1;

    if (score >= 8) return "A+";
    if (score >= 6) return "A";
    if (score >= 4) return "B";
    if (score >= 2) return "C";
    if (score >= 1) return "D";
    return "F";
  }

  // ── Time-Based Analysis ──
  analyzeByHour(): DimensionPerformance[] {
    const groups = new Map<number, Trade[]>();
    for (const t of this.closedTrades) {
      const hour = new Date(t.entryDate).getHours();
      if (!groups.has(hour)) groups.set(hour, []);
      groups.get(hour)!.push(t);
    }
    return [...groups.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hour, trades]) => this.calculateDimensionPerformance(`${hour}:00`, trades));
  }

  analyzeByWeekday(): DimensionPerformance[] {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const groups = new Map<string, Trade[]>();
    for (const t of this.closedTrades) {
      const day = days[new Date(t.entryDate).getDay()];
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day)!.push(t);
    }
    return days
      .filter((d) => groups.has(d))
      .map((day) => this.calculateDimensionPerformance(day, groups.get(day)!));
  }

  // ── Pattern Detection ──
  detectPatterns(): PatternInsight[] {
    if (this.closedTrades.length < 2) return [];
    
    const patterns: PatternInsight[] = [];
    const MIN_T = Math.min(3, Math.max(2, Math.floor(this.closedTrades.length * 0.15)));

    // Helper to create a pattern entry
    const add = (type: "winning" | "losing", pattern: string, desc: string, dp: DimensionPerformance, action: string) => {
      patterns.push({
        type,
        pattern,
        description: desc,
        trades: dp.trades,
        winRate: dp.winRate,
        avgPnl: dp.avgPnl,
        confidence: Math.min(dp.trades / 10, 1) * 100,
        actionable: action,
        financialImpact: dp.pnl,
      });
    };

    // Analyze all dimensions
    const dims: { label: string; key: "symbol" | "strategy" | "setup" | "session" | "timeframe" | "direction" | "marketType"; singular: string }[] = [
      { label: "Instrument", key: "symbol", singular: "instrument" },
      { label: "Strategy", key: "strategy", singular: "strategy" },
      { label: "Setup", key: "setup", singular: "setup" },
      { label: "Session", key: "session", singular: "session" },
      { label: "Timeframe", key: "timeframe", singular: "timeframe" },
      { label: "Direction", key: "direction", singular: "direction" },
    ];

    for (const dim of dims) {
      const items = this.analyzeDimension(dim.key).filter((d) => d.name !== "Unknown");
      for (const item of items) {
        if (item.trades < MIN_T) continue;
        if (item.winRate >= 60 && item.pnl > 0) {
          const detail = item.avgPips !== 0 ? item.avgPips.toFixed(1) + " avg pips" : item.avgPnl.toFixed(2) + " avg P&L";
          add("winning", `Strong ${dim.label}: ${item.name}`, `${item.winRate}% WR over ${item.trades} trades with ${detail}`, item, `Keep using ${item.name} - it is a proven ${dim.singular}`);
        } else if (item.winRate <= 35 && item.pnl < 0) {
          add("losing", `Weak ${dim.label}: ${item.name}`, `Only ${item.winRate}% WR over ${item.trades} trades, costing you ${Math.abs(item.pnl).toFixed(2)}`, item, `Review or avoid ${item.name} - consistently unprofitable`);
        }
      }

      // Best vs worst comparison
      const profitable = items.filter((i) => i.trades >= MIN_T && i.pnl > 0).sort((a, b) => b.pnl - a.pnl);
      const unprofitable = items.filter((i) => i.trades >= MIN_T && i.pnl < 0).sort((a, b) => a.pnl - b.pnl);
      if (profitable.length > 0 && unprofitable.length > 0) {
        const best = profitable[0];
        const worst = unprofitable[0];
        patterns.push({
          type: "winning",
          pattern: `${dim.label} Edge: ${best.name} vs ${worst.name}`,
          description: `${best.name} makes you ${best.pnl.toFixed(2)} while ${worst.name} costs you ${Math.abs(worst.pnl).toFixed(2)}`,
          trades: best.trades + worst.trades,
          winRate: best.winRate,
          avgPnl: best.avgPnl,
          confidence: Math.min((best.trades + worst.trades) / 15, 1) * 100,
          actionable: `Shift volume from ${worst.name} to ${best.name} for immediate improvement`,
          financialImpact: best.pnl + Math.abs(worst.pnl),
        });
      }
    }

    // Emotional patterns
    const emotionGroups = new Map<string, { wins: number; total: number; pnl: number }>();
    for (const t of this.closedTrades) {
      const emo = t.emotionEntry || "Unknown";
      if (emo === "Unknown") continue;
      if (!emotionGroups.has(emo)) emotionGroups.set(emo, { wins: 0, total: 0, pnl: 0 });
      const g = emotionGroups.get(emo)!;
      g.total++;
      g.pnl += num(t.pnl);
      if (t.outcome === "win") g.wins++;
    }
    for (const [emo, data] of emotionGroups) {
      if (data.total < 2) continue;
      const wr = (data.wins / data.total) * 100;
      if (wr >= 60 && data.pnl > 0) {
        patterns.push({ type: "winning", pattern: `Profitable when ${emo}`, description: `${wr.toFixed(0)}% WR over ${data.total} trades`, trades: data.total, winRate: round(wr), avgPnl: round(data.pnl / data.total), confidence: Math.min(data.total / 10, 1) * 100, actionable: `You trade best when feeling ${emo} — only trade in this state`, financialImpact: data.pnl });
      } else if (wr <= 35 && data.pnl < 0) {
        patterns.push({ type: "losing", pattern: `Losing when ${emo}`, description: `Only ${wr.toFixed(0)}% WR over ${data.total} trades`, trades: data.total, winRate: round(wr), avgPnl: round(data.pnl / data.total), confidence: Math.min(data.total / 10, 1) * 100, actionable: `Stop trading when feeling ${emo} — it costs you money`, financialImpact: data.pnl });
      }
    }

    // Time-of-day patterns
    const byHour = this.analyzeByHour();
    const bestHours = byHour.filter((h) => h.trades >= MIN_T && h.pnl > 0).sort((a, b) => b.pnl - a.pnl);
    const worstHours = byHour.filter((h) => h.trades >= MIN_T && h.pnl < 0).sort((a, b) => a.pnl - b.pnl);
    if (bestHours.length > 0) {
      patterns.push({ type: "winning", pattern: `Best hour: ${bestHours[0].name}`, description: `${bestHours[0].winRate}% WR, ${bestHours[0].avgPips.toFixed(1)} avg pips`, trades: bestHours[0].trades, winRate: bestHours[0].winRate, avgPnl: bestHours[0].avgPnl, confidence: Math.min(bestHours[0].trades / 8, 1) * 100, actionable: `Focus your entries around ${bestHours[0].name}`, financialImpact: bestHours[0].pnl });
    }
    if (worstHours.length > 0) {
      patterns.push({ type: "losing", pattern: `Worst hour: ${worstHours[0].name}`, description: `${worstHours[0].winRate}% WR, losing ${Math.abs(worstHours[0].pnl).toFixed(2)} total`, trades: worstHours[0].trades, winRate: worstHours[0].winRate, avgPnl: worstHours[0].avgPnl, confidence: Math.min(worstHours[0].trades / 8, 1) * 100, actionable: `Avoid trading around ${worstHours[0].name}`, financialImpact: worstHours[0].pnl });
    }

    // Weekday patterns
    const byWeekday = this.analyzeByWeekday();
    const bestDay = byWeekday.filter((d) => d.trades >= MIN_T && d.pnl > 0).sort((a, b) => b.pnl - a.pnl);
    const worstDay = byWeekday.filter((d) => d.trades >= MIN_T && d.pnl < 0).sort((a, b) => a.pnl - b.pnl);
    if (bestDay.length > 0) {
      patterns.push({ type: "winning", pattern: `Best day: ${bestDay[0].name}`, description: `${bestDay[0].winRate}% WR over ${bestDay[0].trades} trades`, trades: bestDay[0].trades, winRate: bestDay[0].winRate, avgPnl: bestDay[0].avgPnl, confidence: Math.min(bestDay[0].trades / 8, 1) * 100, actionable: `${bestDay[0].name} is your most profitable day`, financialImpact: bestDay[0].pnl });
    }
    if (worstDay.length > 0) {
      patterns.push({ type: "losing", pattern: `Worst day: ${worstDay[0].name}`, description: `${worstDay[0].winRate}% WR, losing ${Math.abs(worstDay[0].pnl).toFixed(2)} total`, trades: worstDay[0].trades, winRate: worstDay[0].winRate, avgPnl: worstDay[0].avgPnl, confidence: Math.min(worstDay[0].trades / 8, 1) * 100, actionable: `Consider reducing activity on ${worstDay[0].name}s`, financialImpact: worstDay[0].pnl });
    }

    // Risk management pattern: trades with vs without SL
    const withSL = this.closedTrades.filter((t) => t.stopLoss);
    const withoutSL = this.closedTrades.filter((t) => !t.stopLoss);
    if (withSL.length >= 2 && withoutSL.length >= 2) {
      const slPnl = withSL.reduce((s, t) => s + num(t.pnl), 0);
      const noSlPnl = withoutSL.reduce((s, t) => s + num(t.pnl), 0);
      const slWR = (withSL.filter((t) => t.outcome === "win").length / withSL.length) * 100;
      const noSlWR = (withoutSL.filter((t) => t.outcome === "win").length / withoutSL.length) * 100;
      if (slPnl > noSlPnl) {
        patterns.push({ type: "winning", pattern: "Using stop losses is profitable", description: `With SL: ${slWR.toFixed(0)}% WR (${formatCurrencySimple(slPnl)}), Without: ${noSlWR.toFixed(0)}% WR (${formatCurrencySimple(noSlPnl)})`, trades: withSL.length, winRate: round(slWR), avgPnl: round(slPnl / withSL.length), confidence: Math.min(withSL.length / 10, 1) * 100, actionable: "Always set a stop loss — your results prove it works", financialImpact: slPnl - noSlPnl });
      } else if (noSlPnl > slPnl && noSlPnl > 0) {
        patterns.push({ type: "neutral", pattern: "Performance without stop losses", description: `Without SL trades are currently more profitable`, trades: withoutSL.length, winRate: round(noSlWR), avgPnl: round(noSlPnl / withoutSL.length), confidence: 50, actionable: "Even though no-SL trades appear profitable, always use stops for risk management", financialImpact: 0 });
      }
    }

    return patterns.sort((a, b) => Math.abs(b.financialImpact) - Math.abs(a.financialImpact));
  }

  // ── Confluence Analysis ──
  analyzeConfluences(): ConfluencePattern[] {
    if (!this.hasEnoughData(3)) return [];
    
    const confluences: ConfluencePattern[] = [];
    const tradesByConfluence = new Map<string, Trade[]>();

    for (const t of this.closedTrades) {
      const factors: string[] = [];
      if (t.strategy) factors.push(`Strategy:${t.strategy}`);
      if (t.setup) factors.push(`Setup:${t.setup}`);
      if (t.session) factors.push(`Session:${t.session}`);
      if (t.timeframe) factors.push(`TF:${t.timeframe}`);
      
      if (factors.length >= 2) {
        const key = factors.sort().join("+");
        if (!tradesByConfluence.has(key)) tradesByConfluence.set(key, []);
        tradesByConfluence.get(key)!.push(t);
      }
    }

    for (const [key, trades] of tradesByConfluence.entries()) {
      if (trades.length >= 2) {
        const wins = trades.filter((t) => t.outcome === "win");
        const pnl = trades.reduce((sum, t) => sum + num(t.pnl), 0);
        const winRate = (wins.length / trades.length) * 100;
        const rValues = trades.map((t) => num(t.rMultiple)).filter((r) => r !== 0);
        const avgR = rValues.length > 0 ? rValues.reduce((a, b) => a + b, 0) / rValues.length : 0;
        const winPnl = wins.reduce((sum, t) => sum + num(t.pnl), 0);
        const lossPnl = trades.filter((t) => t.outcome === "loss").reduce((sum, t) => sum + num(t.pnl), 0);
        const pf = lossPnl !== 0 ? Math.abs(winPnl / lossPnl) : winPnl > 0 ? Infinity : 0;

        confluences.push({
          factors: key.split("+"),
          trades: trades.length,
          winRate: round(winRate),
          avgPnl: round(pnl / trades.length),
          avgR: round(avgR),
          grade: this.calculateGrade(winRate, pf, avgR, trades.length),
        });
      }
    }

    return confluences.sort((a, b) => {
      const gradeOrder = { "A+": 0, "A": 1, "B": 2, "C": 3, "D": 4, "F": 5 };
      return gradeOrder[a.grade] - gradeOrder[b.grade];
    });
  }

  // ── Mistake Analysis ──
  analyzeMistakes(): MistakeAnalysis[] {
    const mistakeCounts = new Map<string, { occurrences: number; totalLoss: number; trades: Trade[] }>();
    
    for (const t of this.losses) {
      const mistakes = (t.mistakes as string[]) || [];
      for (const m of mistakes) {
        if (!mistakeCounts.has(m)) mistakeCounts.set(m, { occurrences: 0, totalLoss: 0, trades: [] });
        const data = mistakeCounts.get(m)!;
        data.occurrences++;
        data.totalLoss += Math.abs(num(t.pnl));
        data.trades.push(t);
      }
    }

    const totalLosses = this.losses.length;
    
    return [...mistakeCounts.entries()]
      .map(([mistake, data]) => ({
        mistake,
        occurrences: data.occurrences,
        totalLoss: round(data.totalLoss),
        avgLoss: round(data.totalLoss / data.occurrences),
        percentOfLosses: totalLosses > 0 ? round((data.occurrences / totalLosses) * 100) : 0,
        recommendation: this.getMistakeRecommendation(mistake, data.occurrences, totalLosses),
      }))
      .sort((a, b) => b.totalLoss - a.totalLoss);
  }

  private getMistakeRecommendation(mistake: string, occurrences: number, totalLosses: number): string {
    const freq = totalLosses > 0 ? occurrences / totalLosses : 0;
    if (freq >= 0.3) return `Critical: "${mistake}" appears in ${(freq * 100).toFixed(0)}% of losses. Make this your #1 focus.`;
    if (freq >= 0.15) return `Important: Create a pre-trade checklist item to avoid "${mistake}"`;
    return `Monitor: Track "${mistake}" and review when it happens`;
  }

  // ── What Worked Analysis ──
  analyzeWhatWorked(): { factor: string; occurrences: number; totalProfit: number; avgProfit: number }[] {
    const counts = new Map<string, { occurrences: number; totalProfit: number }>();
    
    for (const t of this.wins) {
      const factors = (t.whatWorked as string[]) || [];
      for (const f of factors) {
        if (!counts.has(f)) counts.set(f, { occurrences: 0, totalProfit: 0 });
        const data = counts.get(f)!;
        data.occurrences++;
        data.totalProfit += num(t.pnl);
      }
    }

    return [...counts.entries()]
      .map(([factor, data]) => ({
        factor,
        occurrences: data.occurrences,
        totalProfit: round(data.totalProfit),
        avgProfit: round(data.totalProfit / data.occurrences),
      }))
      .sort((a, b) => b.totalProfit - a.totalProfit);
  }

  // ── Decision Quality Score ──
  calculateDecisionQuality(): DecisionQualityScore {
    if (!this.hasEnoughData(5)) {
      return {
        overall: 0,
        components: { planAdherence: 0, riskManagement: 0, entryQuality: 0, exitQuality: 0, emotionalControl: 0 },
        trend: "stable",
        recentScore: 0,
      };
    }

    // Plan Adherence: trades with strategy and setup
    const withPlan = this.closedTrades.filter((t) => t.strategy && t.setup).length;
    const planAdherence = (withPlan / this.closedTrades.length) * 100;

    // Risk Management: trades with SL and proper position sizing
    const withRisk = this.closedTrades.filter((t) => t.stopLoss && t.riskAmount).length;
    const riskManagement = (withRisk / this.closedTrades.length) * 100;

    // Entry Quality: win rate and average R on wins
    const avgWinR = this.wins.map((t) => num(t.rMultiple)).filter((r) => r > 0);
    const entryQuality = Math.min(100, (this.calculateMetrics().winRate + (avgWinR.length > 0 ? avgWinR.reduce((a, b) => a + b, 0) / avgWinR.length * 20 : 0)) / 1.2);

    // Exit Quality: trades that hit TP vs stopped out
    const hitTp = this.wins.filter((t) => t.takeProfit && Math.abs(num(t.exitPrice) - num(t.takeProfit)) < 0.0001).length;
    const exitQuality = this.wins.length > 0 ? (hitTp / this.wins.length) * 100 : 50;

    // Emotional Control: documented emotions and following rules
    const withEmotions = this.closedTrades.filter((t) => t.emotionEntry).length;
    const calmTrades = this.closedTrades.filter((t) => t.emotionEntry === "calm" || t.emotionEntry === "confident" || t.emotionEntry === "focused").length;
    const emotionalControl = withEmotions > 0 ? (calmTrades / withEmotions) * 100 : 50;

    const overall = (planAdherence * 0.25 + riskManagement * 0.25 + entryQuality * 0.2 + exitQuality * 0.15 + emotionalControl * 0.15);

    // Calculate recent score (last 10 trades)
    const recent = this.closedTrades.slice(0, 10);
    const recentWithPlan = recent.filter((t) => t.strategy && t.setup).length;
    const recentScore = (recentWithPlan / Math.max(recent.length, 1)) * 100;

    // Trend
    const trend = recentScore > overall + 5 ? "improving" : recentScore < overall - 5 ? "declining" : "stable";

    return {
      overall: round(overall),
      components: {
        planAdherence: round(planAdherence),
        riskManagement: round(riskManagement),
        entryQuality: round(entryQuality),
        exitQuality: round(exitQuality),
        emotionalControl: round(emotionalControl),
      },
      trend,
      recentScore: round(recentScore),
    };
  }

  // ── Period Reviews ──
  generatePeriodReview(startDate: Date, endDate: Date, periodName: string): PeriodReview {
    const periodTrades = this.closedTrades.filter((t) => {
      const d = new Date(t.exitDate || t.entryDate);
      return d >= startDate && d <= endDate;
    });

    if (periodTrades.length === 0) {
      return {
        period: periodName,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        trades: 0,
        pnl: 0,
        winRate: 0,
        avgR: 0,
        bestDay: null,
        worstDay: null,
        strengths: [],
        weaknesses: [],
        improvements: [],
        deteriorations: [],
        topMistakes: [],
        highProbabilityConditions: [],
        singleBiggestImprovement: "Log more trades to generate insights",
        decisionQuality: 0,
      };
    }

    const periodEngine = new InsightEngine(periodTrades);
    const metrics = periodEngine.calculateMetrics();

    // Daily aggregation
    const byDay = new Map<string, number>();
    for (const t of periodTrades) {
      const day = new Date(t.exitDate || t.entryDate).toISOString().split("T")[0];
      byDay.set(day, (byDay.get(day) || 0) + num(t.pnl));
    }
    const days = [...byDay.entries()];
    const bestDay = days.length > 0 ? days.reduce((best, curr) => curr[1] > best[1] ? curr : best) : null;
    const worstDay = days.length > 0 ? days.reduce((worst, curr) => curr[1] < worst[1] ? curr : worst) : null;

    // Analyze strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (metrics.winRate >= 55) strengths.push(`Strong ${metrics.winRate}% win rate`);
    else if (metrics.winRate < 45) weaknesses.push(`Low ${metrics.winRate}% win rate needs improvement`);

    if (metrics.profitFactor >= 1.5) strengths.push(`Excellent ${metrics.profitFactor} profit factor`);
    else if (metrics.profitFactor < 1) weaknesses.push(`Negative profit factor - losses exceed wins`);

    if (metrics.avgRMultiple >= 1) strengths.push(`Good average R of ${metrics.avgRMultiple}`);
    else if (metrics.avgRMultiple < 0.5) weaknesses.push(`Low R multiple - improve reward:risk`);

    // Top performing dimensions
    const strategies = periodEngine.analyzeDimension("strategy").filter((s) => s.name !== "Unknown");
    const bestStrategy = strategies.find((s) => s.grade === "A+" || s.grade === "A");
    if (bestStrategy) strengths.push(`${bestStrategy.name} strategy performing well (${bestStrategy.winRate}%)`);

    const worstStrategy = strategies.find((s) => s.grade === "F" || s.grade === "D");
    if (worstStrategy) weaknesses.push(`${worstStrategy.name} strategy underperforming (${worstStrategy.winRate}%)`);

    // Mistakes
    const mistakes = periodEngine.analyzeMistakes();
    const topMistakes = mistakes.slice(0, 3).map((m) => m.mistake);

    // High probability conditions
    const confluences = periodEngine.analyzeConfluences();
    const highProbabilityConditions = confluences
      .filter((c) => c.grade === "A+" || c.grade === "A")
      .slice(0, 3)
      .map((c) => c.factors.join(" + "));

    // Single biggest improvement
    let singleBiggestImprovement = "Continue refining your trading plan";
    if (mistakes.length > 0 && mistakes[0].totalLoss > 0) {
      singleBiggestImprovement = `Eliminating "${mistakes[0].mistake}" could save you $${mistakes[0].totalLoss.toFixed(2)}`;
    } else if (weaknesses.length > 0) {
      singleBiggestImprovement = weaknesses[0];
    }

    // Decision quality
    const dq = periodEngine.calculateDecisionQuality();

    return {
      period: periodName,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      trades: periodTrades.length,
      pnl: round(metrics.totalPnl),
      winRate: metrics.winRate,
      avgR: metrics.avgRMultiple,
      bestDay: bestDay ? { date: bestDay[0], pnl: round(bestDay[1]) } : null,
      worstDay: worstDay ? { date: worstDay[0], pnl: round(worstDay[1]) } : null,
      strengths,
      weaknesses,
      improvements: strengths.slice(0, 2),
      deteriorations: weaknesses.slice(0, 2),
      topMistakes,
      highProbabilityConditions,
      singleBiggestImprovement,
      decisionQuality: dq.overall,
    };
  }

  // ── Calendar Data ──
  generateCalendarData(): CalendarDay[] {
    const byDay = new Map<string, { trades: Trade[]; pnl: number }>();
    
    for (const t of this.closedTrades) {
      const date = new Date(t.exitDate || t.entryDate).toISOString().split("T")[0];
      if (!byDay.has(date)) byDay.set(date, { trades: [], pnl: 0 });
      const day = byDay.get(date)!;
      day.trades.push(t);
      day.pnl += num(t.pnl);
    }

    const maxPnl = Math.max(...[...byDay.values()].map((d) => Math.abs(d.pnl)), 1);

    return [...byDay.entries()].map(([date, data]) => ({
      date,
      trades: data.trades.length,
      pnl: round(data.pnl),
      winRate: round((data.trades.filter((t) => t.outcome === "win").length / data.trades.length) * 100),
      intensity: data.pnl / maxPnl, // -1 to 1
    }));
  }

  // ── Trade Comparison ──
  compareTrades(tradeA: Trade, tradeB: Trade): TradeComparison {
    const similarities: string[] = [];
    const differences: string[] = [];
    const keyFactors: string[] = [];

    // Check similarities
    if (tradeA.symbol === tradeB.symbol) similarities.push(`Same instrument: ${tradeA.symbol}`);
    if (tradeA.strategy === tradeB.strategy && tradeA.strategy) similarities.push(`Same strategy: ${tradeA.strategy}`);
    if (tradeA.setup === tradeB.setup && tradeA.setup) similarities.push(`Same setup: ${tradeA.setup}`);
    if (tradeA.session === tradeB.session && tradeA.session) similarities.push(`Same session: ${tradeA.session}`);
    if (tradeA.direction === tradeB.direction) similarities.push(`Same direction: ${tradeA.direction}`);
    if (tradeA.timeframe === tradeB.timeframe && tradeA.timeframe) similarities.push(`Same timeframe: ${tradeA.timeframe}`);

    // Check differences
    if (tradeA.symbol !== tradeB.symbol) differences.push(`Different instruments: ${tradeA.symbol} vs ${tradeB.symbol}`);
    if (tradeA.strategy !== tradeB.strategy) differences.push(`Different strategies: ${tradeA.strategy || "none"} vs ${tradeB.strategy || "none"}`);
    if (tradeA.session !== tradeB.session) differences.push(`Different sessions: ${tradeA.session || "none"} vs ${tradeB.session || "none"}`);
    
    // Key factors for outcome difference
    const winner = tradeA.outcome === "win" ? tradeA : tradeB;
    const loser = tradeA.outcome === "loss" ? tradeA : tradeB;

    if (winner.outcome === "win" && loser.outcome === "loss") {
      if (winner.riskAmount && !loser.riskAmount) keyFactors.push("Winner had defined risk management");
      if ((winner.whatWorked as string[])?.length > 0) keyFactors.push(`Winner noted: ${(winner.whatWorked as string[]).join(", ")}`);
      if ((loser.mistakes as string[])?.length > 0) keyFactors.push(`Loser's mistakes: ${(loser.mistakes as string[]).join(", ")}`);
      if (winner.confidence && loser.confidence && winner.confidence > loser.confidence) keyFactors.push("Winner had higher confidence");
    }

    // Generate lesson
    let lesson = "Both trades had similar setups";
    if (keyFactors.length > 0) {
      lesson = `Key difference: ${keyFactors[0]}`;
    } else if (differences.length > 0) {
      lesson = differences[0];
    }

    return { tradeA, tradeB, similarities, differences, keyFactors, lesson };
  }

  // ── Find Similar Trades ──
  findSimilarTrades(trade: Trade, limit = 5): Trade[] {
    return this.closedTrades
      .filter((t) => t.id !== trade.id)
      .map((t) => {
        let score = 0;
        if (t.symbol === trade.symbol) score += 3;
        if (t.strategy === trade.strategy && trade.strategy) score += 2;
        if (t.setup === trade.setup && trade.setup) score += 2;
        if (t.session === trade.session && trade.session) score += 1;
        if (t.direction === trade.direction) score += 1;
        if (t.timeframe === trade.timeframe && trade.timeframe) score += 1;
        return { trade: t, score };
      })
      .filter((t) => t.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((t) => t.trade);
  }

  // ── Generate Personal Playbook ──
  generatePlaybook(): {
    aSetups: { name: string; conditions: string[]; performance: DimensionPerformance }[];
    rules: string[];
    avoidList: string[];
    optimalConditions: string[];
  } {
    const aSetups: { name: string; conditions: string[]; performance: DimensionPerformance }[] = [];
    
    // A+ Strategies
    const strategies = this.analyzeDimension("strategy").filter((s) => s.name !== "Unknown" && s.trades >= 2);
    for (const s of strategies.filter((s) => s.grade === "A+" || s.grade === "A" || s.grade === "B")) {
      const conditions: string[] = [];
      // Find common conditions for this strategy
      const strategyTrades = this.closedTrades.filter((t) => t.strategy === s.name);
      const commonSession = this.getMostCommon(strategyTrades.map((t) => t.session).filter(Boolean) as string[]);
      const commonTf = this.getMostCommon(strategyTrades.map((t) => t.timeframe).filter(Boolean) as string[]);
      if (commonSession) conditions.push(`Best in ${commonSession} session`);
      if (commonTf) conditions.push(`Use ${commonTf} timeframe`);
      aSetups.push({ name: s.name, conditions, performance: s });
    }

    // Build rules from patterns
    const rules: string[] = [];
    const patterns = this.detectPatterns();
    for (const p of patterns.filter((p) => p.type === "winning" && p.confidence >= 70)) {
      rules.push(p.actionable);
    }

    // Avoid list from poor performers
    const avoidList: string[] = [];
    for (const inst of this.analyzeDimension("symbol").filter((i) => i.trades >= 5 && i.grade === "F")) {
      avoidList.push(`${inst.name} (${inst.winRate}% win rate)`);
    }
    for (const s of strategies.filter((s) => s.grade === "F")) {
      avoidList.push(`${s.name} strategy (${s.winRate}% win rate)`);
    }

    // Optimal conditions from confluences
    const optimalConditions = this.analyzeConfluences()
      .filter((c) => c.grade === "A+" || c.grade === "A")
      .slice(0, 5)
      .map((c) => c.factors.join(" + "));

    return { aSetups, rules, avoidList, optimalConditions };
  }

  private getMostCommon(arr: string[]): string | null {
    if (arr.length === 0) return null;
    const counts = new Map<string, number>();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  // ── Generate Insight Summary ──
  generateSummary(): InsightSummary {
    const minRequired = 3;
    const hasData = this.hasEnoughData(minRequired);
    const dataQuality = this.getDataQualityScore();

    if (!hasData) {
      return {
        hasEnoughData: false,
        minTradesRequired: minRequired,
        currentTrades: this.closedTrades.length,
        dataQualityScore: dataQuality,
        primaryInsight: `Log ${minRequired - this.closedTrades.length} more trades to unlock insights`,
        keepDoing: [],
        stopDoing: [],
        improve: [],
      };
    }

    const patterns = this.detectPatterns();
    const mistakes = this.analyzeMistakes();
    const playbook = this.generatePlaybook();
    const metrics = this.calculateMetrics();

    const keepDoing: string[] = [];
    const stopDoing: string[] = [];
    const improve: string[] = [];

    // Keep doing - from winning patterns
    for (const p of patterns.filter((p) => p.type === "winning").slice(0, 3)) {
      keepDoing.push(p.actionable);
    }

    // Stop doing - from mistakes and losing patterns
    for (const m of mistakes.slice(0, 2)) {
      stopDoing.push(`Stop: ${m.mistake} (cost you $${m.totalLoss})`);
    }
    for (const a of playbook.avoidList.slice(0, 2)) {
      stopDoing.push(`Avoid: ${a}`);
    }

    // Improve
    if (metrics.winRate < 50) improve.push("Focus on higher-probability setups to improve win rate");
    if (metrics.avgRMultiple < 1) improve.push("Let winners run longer to improve R multiple");
    if (dataQuality < 70) improve.push("Add more details to trades (strategy, setup, mistakes)");

    // Primary insight
    let primaryInsight = "Your trading is on track. Focus on consistency.";
    if (mistakes.length > 0 && mistakes[0].totalLoss > metrics.totalPnl * 0.5) {
      primaryInsight = `Eliminating "${mistakes[0].mistake}" could significantly improve your results`;
    } else if (playbook.aSetups.length > 0) {
      primaryInsight = `Your ${playbook.aSetups[0].name} strategy is your edge - focus here`;
    } else if (metrics.winRate >= 55) {
      primaryInsight = "Strong win rate! Focus on increasing position size on A+ setups";
    }

    return {
      hasEnoughData: true,
      minTradesRequired: minRequired,
      currentTrades: this.closedTrades.length,
      dataQualityScore: dataQuality,
      primaryInsight,
      keepDoing,
      stopDoing,
      improve,
    };
  }

  // ── Equity Curve Data ──
  getEquityCurve(startingBalance: number): { date: string; equity: number; pnl: number }[] {
    const sorted = [...this.closedTrades]
      .filter((t) => t.exitDate)
      .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());

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

  // ── R Distribution ──
  getRDistribution(): { range: string; count: number; pnl: number }[] {
    const ranges = [
      { min: -Infinity, max: -2, label: "< -2R" },
      { min: -2, max: -1, label: "-2R to -1R" },
      { min: -1, max: 0, label: "-1R to 0" },
      { min: 0, max: 1, label: "0 to 1R" },
      { min: 1, max: 2, label: "1R to 2R" },
      { min: 2, max: 3, label: "2R to 3R" },
      { min: 3, max: Infinity, label: "> 3R" },
    ];

    return ranges.map((r) => {
      const trades = this.closedTrades.filter((t) => {
        const rm = num(t.rMultiple);
        return rm > r.min && rm <= r.max;
      });
      return {
        range: r.label,
        count: trades.length,
        pnl: round(trades.reduce((sum, t) => sum + num(t.pnl), 0)),
      };
    });
  }

  // ── Missed Trade Analysis ──
  analyzeMissedTrades(): {
    totalMissed: number;
    missedWins: number;
    missedLosses: number;
    missedProfitAvoided: number;
    missedLossAvoided: number;
    netAvoided: number;
    trades: Trade[];
  } {
    const missedWins = this.missedTrades.filter((t) => t.outcome === "win");
    const missedLosses = this.missedTrades.filter((t) => t.outcome === "loss");
    const missedProfitAvoided = missedWins.reduce((s, t) => s + num(t.pnl), 0);
    const missedLossAvoided = missedLosses.reduce((s, t) => s + Math.abs(num(t.pnl)), 0);

    return {
      totalMissed: this.missedTrades.length,
      missedWins: missedWins.length,
      missedLosses: missedLosses.length,
      missedProfitAvoided: round(missedProfitAvoided),
      missedLossAvoided: round(missedLossAvoided),
      netAvoided: round(missedProfitAvoided - missedLossAvoided),
      trades: this.missedTrades,
    };
  }
}

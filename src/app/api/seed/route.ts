import { db } from "@/db";
import { trades, customOptions, accountSettings } from "@/db/schema";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

export async function GET() {
  return NextResponse.json({
    message: "Seed API is working. Use POST request to insert seed data."
  });
}

export async function POST() {
  try {
    // Check if we already have trades
    const existing = await db.select({ count: sql<number>`count(*)::int` }).from(trades);
    if (existing[0].count > 0) {
      return NextResponse.json({ message: "Trades already exist", count: existing[0].count });
    }

    // Seed custom options first
    const opts = [
      { type: "strategy" as const, value: "Breakout" },
      { type: "strategy" as const, value: "Pullback" },
      { type: "strategy" as const, value: "Reversal" },
      { type: "setup" as const, value: "Double Bottom" },
      { type: "setup" as const, value: "Fib Retracement" },
      { type: "setup" as const, value: "Supply Zone" },
      { type: "setup" as const, value: "Order Block" },
      { type: "what_worked" as const, value: "Waited for confirmation" },
      { type: "what_worked" as const, value: "Followed the plan" },
      { type: "what_worked" as const, value: "Clean entry" },
      { type: "what_worked" as const, value: "Let winner run" },
      { type: "mistake" as const, value: "Entered too early" },
      { type: "mistake" as const, value: "Moved stop loss" },
      { type: "mistake" as const, value: "No confirmation" },
      { type: "mistake" as const, value: "Revenge trade" },
      { type: "instrument" as const, value: "EUR/USD" },
      { type: "instrument" as const, value: "GBP/USD" },
      { type: "instrument" as const, value: "XAU/USD" },
      { type: "instrument" as const, value: "BTC/USD" },
    ];

    for (const o of opts) {
      await db.insert(customOptions).values(o).onConflictDoNothing();
    }

    // Ensure settings exist
    const settingsExist = await db.select({ count: sql<number>`count(*)::int` }).from(accountSettings);
    if (settingsExist[0].count === 0) {
      await db.insert(accountSettings).values({
        accountName: "Main Account",
        startingBalance: "10000",
        currency: "USD",
      });
    }

    const now = new Date();
    const d = (daysAgo: number, hours = 10) => {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(hours, Math.floor(Math.random() * 59), 0, 0);
      return date;
    };

    const seedTrades = [
      {
        symbol: "EUR/USD", marketType: "forex" as const, direction: "long" as const, status: "closed" as const, outcome: "win" as const,
        session: "london" as const, entryPrice: "1.08450", exitPrice: "1.08720", stopLoss: "1.08300", takeProfit: "1.08750",
        positionSize: "1.00", accountSize: "10000", riskAmount: "150", riskPercent: "1.5000",
        pipsCaptured: "27.0", pnl: "270.00", pnlPercent: "2.7000", fees: "2",
        riskRewardRatio: "1.80", rMultiple: "1.80",
        entryDate: d(7, 9), exitDate: d(7, 14),
        strategy: "Breakout", setup: "Supply Zone", timeframe: "H1",
        emotionEntry: "calm", confidence: 8,
        whatWorked: ["Waited for confirmation", "Followed the plan"],
        mistakes: [],
        whatIDid: "Identified supply zone on H1, waited for London session breakout, entered on retest with clean risk.",
        whatIShouldHaveDone: "Could have trailed stop to lock more profit.",
        notes: "Strong momentum after London open. Price broke above Asian high and retested. Clean trade.",
        tags: ["trend", "high-probability"],
      },
      {
        symbol: "GBP/USD", marketType: "forex" as const, direction: "short" as const, status: "closed" as const, outcome: "loss" as const,
        session: "new_york" as const, entryPrice: "1.27100", exitPrice: "1.27350", stopLoss: "1.27350", takeProfit: "1.26800",
        positionSize: "1.00", accountSize: "10270", riskAmount: "250", riskPercent: "2.4340",
        pipsCaptured: "-25.0", pnl: "-252.00", pnlPercent: "-2.4535", fees: "2",
        riskRewardRatio: "1.20", rMultiple: "-1.01",
        entryDate: d(6, 15), exitDate: d(6, 17),
        strategy: "Reversal", setup: "Double Bottom", timeframe: "M15",
        emotionEntry: "anxious", confidence: 5,
        whatWorked: [],
        mistakes: ["Entered too early", "No confirmation"],
        whatIDid: "Tried to catch a reversal at a level but didn't wait for confirmation candle.",
        whatIShouldHaveDone: "Should have waited for a clear rejection wick and confirmation close before entering.",
        notes: "Entered on a feeling, not on a signal. The level was good but timing was poor. Need to be more patient.",
        tags: ["counter-trend"],
      },
      {
        symbol: "XAU/USD", marketType: "commodities" as const, direction: "long" as const, status: "closed" as const, outcome: "win" as const,
        session: "london" as const, entryPrice: "2340.50", exitPrice: "2358.00", stopLoss: "2332.00", takeProfit: "2360.00",
        positionSize: "0.50", accountSize: "10018", riskAmount: "100", riskPercent: "0.9982",
        pipsCaptured: "175.0", pnl: "875.00", pnlPercent: "8.7347", fees: "5",
        riskRewardRatio: "2.06", rMultiple: "8.70",
        entryDate: d(5, 8), exitDate: d(4, 11),
        strategy: "Breakout", setup: "Order Block", timeframe: "H4",
        emotionEntry: "confident", confidence: 9,
        whatWorked: ["Clean entry", "Let winner run", "Followed the plan"],
        mistakes: [],
        whatIDid: "Spotted bullish order block on H4 chart. Gold was in strong uptrend. Entered on pullback with tight stop.",
        whatIShouldHaveDone: "Perfect execution. Could increase size on setups like this.",
        notes: "Textbook H4 order block entry. Held overnight as planned. Gold rallied strongly on weaker USD.",
        tags: ["trend", "A-setup"],
      },
      {
        symbol: "EUR/USD", marketType: "forex" as const, direction: "long" as const, status: "closed" as const, outcome: "win" as const,
        session: "london" as const, entryPrice: "1.08600", exitPrice: "1.08820", stopLoss: "1.08480", takeProfit: "1.08850",
        positionSize: "1.00", accountSize: "10893", riskAmount: "120", riskPercent: "1.1017",
        pipsCaptured: "22.0", pnl: "218.00", pnlPercent: "2.0013", fees: "2",
        riskRewardRatio: "1.83", rMultiple: "1.82",
        entryDate: d(4, 9), exitDate: d(4, 13),
        strategy: "Pullback", setup: "Fib Retracement", timeframe: "H1",
        emotionEntry: "calm", confidence: 7,
        whatWorked: ["Waited for confirmation", "Clean entry"],
        mistakes: [],
        whatIDid: "Price pulled back to 61.8% fib level. Waited for bullish engulfing on H1 before entry.",
        whatIShouldHaveDone: "Held for the full move to TP instead of exiting slightly early.",
        notes: "Good patience on this one. The fib level held perfectly.",
        tags: ["trend", "fib"],
      },
      {
        symbol: "BTC/USD", marketType: "crypto" as const, direction: "long" as const, status: "closed" as const, outcome: "loss" as const,
        session: "asian" as const, entryPrice: "67500", exitPrice: "66800", stopLoss: "66700", takeProfit: "68500",
        positionSize: "0.10", accountSize: "11111", riskAmount: "80", riskPercent: "0.7200",
        pipsCaptured: "-70.0", pnl: "-72.00", pnlPercent: "-0.6481", fees: "2",
        riskRewardRatio: "1.25", rMultiple: "-0.90",
        entryDate: d(3, 3), exitDate: d(3, 7),
        strategy: "Breakout", setup: "Supply Zone", timeframe: "H4",
        emotionEntry: "confident", confidence: 6,
        whatWorked: [],
        mistakes: ["Moved stop loss"],
        whatIDid: "Saw a breakout forming on BTC H4. Entered long but then moved stop wider when it went against me.",
        whatIShouldHaveDone: "Should have kept stop at original level and accepted the loss. Moving SL increased the loss.",
        notes: "The setup was okay but I managed it poorly. Moving the stop was emotional.",
        tags: ["breakout-fail"],
      },
      {
        symbol: "GBP/USD", marketType: "forex" as const, direction: "long" as const, status: "closed" as const, outcome: "win" as const,
        session: "london" as const, entryPrice: "1.26800", exitPrice: "1.27150", stopLoss: "1.26650", takeProfit: "1.27200",
        positionSize: "1.00", accountSize: "11039", riskAmount: "150", riskPercent: "1.3589",
        pipsCaptured: "35.0", pnl: "348.00", pnlPercent: "3.1525", fees: "2",
        riskRewardRatio: "2.33", rMultiple: "2.32",
        entryDate: d(2, 10), exitDate: d(2, 15),
        strategy: "Pullback", setup: "Fib Retracement", timeframe: "H1",
        emotionEntry: "focused", confidence: 8,
        whatWorked: ["Followed the plan", "Clean entry", "Let winner run"],
        mistakes: [],
        whatIDid: "Followed my pullback playbook perfectly. Waited for confirmation at fib level, entered with defined risk.",
        whatIShouldHaveDone: "Nothing different — this was an ideal execution.",
        notes: "Cable pulled back to 50% fib after a strong impulse move. Entered on bullish hammer confirmation. Perfect R:R.",
        tags: ["A-setup", "trend"],
      },
      {
        symbol: "EUR/USD", marketType: "forex" as const, direction: "short" as const, status: "closed" as const, outcome: "loss" as const,
        session: "new_york" as const, entryPrice: "1.08900", exitPrice: "1.09100", stopLoss: "1.09100", takeProfit: "1.08600",
        positionSize: "0.80", accountSize: "11387", riskAmount: "160", riskPercent: "1.4051",
        pipsCaptured: "-20.0", pnl: "-162.00", pnlPercent: "-1.4227", fees: "2",
        riskRewardRatio: "1.50", rMultiple: "-1.01",
        entryDate: d(1, 14), exitDate: d(1, 16),
        strategy: "Reversal", setup: "Supply Zone", timeframe: "M15",
        emotionEntry: "frustrated", confidence: 4,
        whatWorked: [],
        mistakes: ["Revenge trade", "No confirmation"],
        whatIDid: "Took this trade right after a previous loss. Was trying to make back the money. Didn't wait for proper confirmation.",
        whatIShouldHaveDone: "Should have stepped away after the loss and not traded out of frustration.",
        notes: "Classic revenge trade. I knew it when I entered but did it anyway. Need a rule: no trading after a loss.",
        tags: ["revenge", "emotional"],
      },
      {
        symbol: "XAU/USD", marketType: "commodities" as const, direction: "long" as const, status: "open" as const,
        session: "london" as const, entryPrice: "2365.00", stopLoss: "2355.00", takeProfit: "2385.00",
        positionSize: "0.30", accountSize: "11225", riskAmount: "100", riskPercent: "0.8909",
        entryDate: d(0, 9),
        strategy: "Breakout", setup: "Order Block", timeframe: "H4",
        emotionEntry: "calm", confidence: 8,
        whatWorked: [],
        mistakes: [],
        whatIDid: "Identified fresh H4 order block after strong bullish impulse. Gold trending higher. Clean entry on retest.",
        notes: "Same setup that worked well last week. Following the playbook.",
        tags: ["trend", "A-setup"],
        fees: "0",
      },
    ];

    // Get default account ID to link trades
    const allSettings = await db.select().from(accountSettings);
    const defaultAccount = allSettings.find((a) => a.isDefault) || allSettings[0];
    const acctId = defaultAccount?.id || null;

    for (const trade of seedTrades) {
      await db.insert(trades).values({ ...trade, accountId: acctId } as never);
    }

    return NextResponse.json({ message: "Seeded successfully", count: seedTrades.length });
  } catch (error) {
    console.error("Seed failed:", error);
    return NextResponse.json({ error: "Seed failed: " + (error instanceof Error ? error.message : "Unknown") }, { status: 500 });
  }
}

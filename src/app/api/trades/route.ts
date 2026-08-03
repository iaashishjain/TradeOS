import { db } from "@/db";
import { trades } from "@/db/schema";
import { desc, eq, and, gte, lte, or, ilike, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function num(val: string | number | null | undefined): number {
  if (val == null) return 0;
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? 0 : n;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

if (id) {
  const [trade] = await db
    .select()
    .from(trades)
    .where(eq(trades.id, id));

  return NextResponse.json(trade || null);
}
    const filters: ReturnType<typeof and>[] = [];

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const symbol = searchParams.get("symbol");
    const strategy = searchParams.get("strategy");
    const setup = searchParams.get("setup");
    const session = searchParams.get("session");
    const timeframe = searchParams.get("timeframe");
    const outcome = searchParams.get("outcome");
    const direction = searchParams.get("direction");
    const weekday = searchParams.get("weekday");
    const search = searchParams.get("search");
    const accountId = searchParams.get("accountId");

    if (accountId) filters.push(eq(trades.accountId, accountId));
    if (dateFrom) filters.push(gte(trades.entryDate, dateFrom));
    if (dateTo) filters.push(lte(trades.entryDate, `${dateTo}T23:59`));
    if (symbol) filters.push(ilike(trades.symbol, `%${symbol}%`));
    if (strategy) filters.push(eq(trades.strategy, strategy));
    if (setup) filters.push(eq(trades.setup, setup));
    if (session && session !== "all") filters.push(eq(trades.session, session as any));
    if (timeframe) filters.push(eq(trades.timeframe, timeframe));
    if (outcome && outcome !== "all") filters.push(eq(trades.outcome, outcome as any));
    if (direction && direction !== "all") filters.push(eq(trades.direction, direction as any));
    if (weekday) filters.push(sql`EXTRACT(DOW FROM ${trades.entryDate}) = ${parseInt(weekday)}`);
    if (search) filters.push(or(ilike(trades.symbol, `%${search}%`), ilike(trades.strategy, `%${search}%`), ilike(trades.setup, `%${search}%`), ilike(trades.notes, `%${search}%`)));

    const whereClause = filters.length > 0 ? and(...filters) : undefined;
    const slim = searchParams.get("slim") === "1";

    if (slim) {
      // Exclude heavy screenshot columns for list/dashboard views
      const allTrades = await db.select({
        id: trades.id, symbol: trades.symbol, marketType: trades.marketType,
        direction: trades.direction, status: trades.status, outcome: trades.outcome,
        session: trades.session, entryPrice: trades.entryPrice, exitPrice: trades.exitPrice,
        stopLoss: trades.stopLoss, takeProfit: trades.takeProfit, positionSize: trades.positionSize,
        accountSize: trades.accountSize, riskAmount: trades.riskAmount, riskPercent: trades.riskPercent,
        pipsCaptured: trades.pipsCaptured, pnl: trades.pnl, pnlPercent: trades.pnlPercent,
        fees: trades.fees, riskRewardRatio: trades.riskRewardRatio, rMultiple: trades.rMultiple,
        entryDate: trades.entryDate, exitDate: trades.exitDate,
        strategy: trades.strategy, setup: trades.setup, timeframe: trades.timeframe,
        notes: trades.notes, tags: trades.tags, whatWorked: trades.whatWorked,
        mistakes: trades.mistakes, whatIDid: trades.whatIDid, whatIShouldHaveDone: trades.whatIShouldHaveDone,
        emotionEntry: trades.emotionEntry, confidence: trades.confidence,
        isMissed: trades.isMissed, accountId: trades.accountId,
        createdAt: trades.createdAt, updatedAt: trades.updatedAt,
      }).from(trades).where(whereClause).orderBy(desc(trades.entryDate));
      return NextResponse.json(allTrades);
    }

    const allTrades = await db.select().from(trades).where(whereClause).orderBy(desc(trades.entryDate));
    return NextResponse.json(allTrades);
  } catch (error) {
    console.error("Failed to fetch trades:", error);
    return NextResponse.json({ error: "Failed to fetch trades" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Derive outcome from user-provided P&L or pips — do NOT recalculate prices
    const pnlVal = num(body.pnl);
    const pipsVal = num(body.pipsCaptured);
    const riskAmt = num(body.riskAmount);
    const entryVal = num(body.entryPrice);
    const exitVal = num(body.exitPrice);
    const slVal = num(body.stopLoss);

    // Use outcome from frontend if provided, otherwise derive from prices
    let outcome: "win" | "loss" | "breakeven" | null = body.outcome || null;
    if (!outcome && body.status === "closed" && exitVal > 0) {
      if (pipsVal > 0.01) outcome = "win";
      else if (pipsVal < -0.01) outcome = "loss";
      else {
        const diff = body.direction === "long" ? exitVal - entryVal : entryVal - exitVal;
        if (diff > 0.00001) outcome = "win";
        else if (diff < -0.00001) outcome = "loss";
        else outcome = "breakeven";
      }
    }

    // Calculate R:R from price levels (no lot math needed)
    let riskRewardRatio: string | null = null;
    let rMultiple: string | null = null;
    if (slVal > 0 && entryVal > 0 && exitVal > 0) {
      const riskDist = Math.abs(entryVal - slVal);
      const rewardDist = Math.abs(exitVal - entryVal);
      if (riskDist > 0) {
        riskRewardRatio = (rewardDist / riskDist).toFixed(2);
        // R multiple is signed: positive for profit, negative for loss
        const direction = body.direction === "long" ? (exitVal - entryVal) : (entryVal - exitVal);
        rMultiple = (direction / riskDist).toFixed(2);
      }
    }

    // Risk percent from account size
    const accountSize = num(body.accountSize);
    let riskPercent: string | null = null;
    if (accountSize > 0 && riskAmt > 0) {
      riskPercent = ((riskAmt / accountSize) * 100).toFixed(2);
    }

    // Store exactly what the user entered — no recalculation of prices/pips/pnl
    const [newTrade] = await db
      .insert(trades)
      .values([{
        symbol: (body.symbol || "").toUpperCase(),
        marketType: body.marketType,
        direction: body.direction,
        status: body.status || "closed",
        outcome: outcome,
        session: body.session || null,
        entryPrice: body.entryPrice,
        exitPrice: body.exitPrice || null,
        stopLoss: body.stopLoss || null,
        takeProfit: body.takeProfit || null,
        positionSize: body.positionSize,
        accountSize: body.accountSize || null,
        riskAmount: body.riskAmount || null,
        riskPercent: body.riskPercent || riskPercent,
        pipsCaptured: body.pipsCaptured || null,
        pnl: body.pnl || null,
        pnlPercent: body.pnlPercent || null,
        fees: body.fees || "0",
        riskRewardRatio: riskRewardRatio,
        rMultiple: rMultiple,
        entryDate: body.entryDate ? new Date(body.entryDate) : new Date(),
        exitDate: body.exitDate ? new Date(body.exitDate) : null,
        strategy: body.strategy || null,
        setup: body.setup || null,
        timeframe: body.timeframe || null,
        notes: body.notes || null,
        tags: body.tags || [],
        whatWorked: body.whatWorked || [],
        mistakes: body.mistakes || [],
        whatIDid: body.whatIDid || null,
        whatIShouldHaveDone: body.whatIShouldHaveDone || null,
        emotionEntry: body.emotionEntry || null,
        emotionExit: body.emotionExit || null,
        confidence: body.confidence || null,
        screenshotBefore: body.screenshotBefore || null,
        screenshotAfter: body.screenshotAfter || null,
        playbookId: body.playbookId || null,
        accountId: body.accountId || null,
        isMissed: body.isMissed === true,
      }])
      .returning();

    return NextResponse.json(newTrade, { status: 201 });
  } catch (error) {
    console.error("Failed to create trade:", error);
    return NextResponse.json({ error: "Failed to create trade" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    // Recalculate outcome and R from price levels
    const entryVal = num(updates.entryPrice);
    const exitVal = num(updates.exitPrice);
    const slVal = num(updates.stopLoss);
    const pipsVal = num(updates.pipsCaptured);

    if (updates.status === "closed" && exitVal > 0 && entryVal > 0) {
      if (pipsVal > 0.01) updates.outcome = "win";
      else if (pipsVal < -0.01) updates.outcome = "loss";
      else {
        const diff = updates.direction === "long" ? exitVal - entryVal : entryVal - exitVal;
        if (diff > 0.00001) updates.outcome = "win";
        else if (diff < -0.00001) updates.outcome = "loss";
        else updates.outcome = "breakeven";
      }
    }

    if (slVal > 0 && entryVal > 0 && exitVal > 0) {
      const riskDist = Math.abs(entryVal - slVal);
      const rewardDist = Math.abs(exitVal - entryVal);
      if (riskDist > 0) {
        updates.riskRewardRatio = (rewardDist / riskDist).toFixed(2);
        const direction = updates.direction === "long" ? (exitVal - entryVal) : (entryVal - exitVal);
        updates.rMultiple = (direction / riskDist).toFixed(2);
      }
    }

    if (updates.entryDate) updates.entryDate = new Date(`${updates.entryDate}:00`);
    if (updates.exitDate) updates.exitDate = new Date(`${updates.exitDate}:00`);
    updates.updatedAt = new Date();
    if (updates.symbol) updates.symbol = updates.symbol.toUpperCase();

    const [updated] = await db
      .update(trades)
      .set(updates)
      .where(eq(trades.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update trade:", error);
    return NextResponse.json({ error: "Failed to update trade" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await db.delete(trades).where(eq(trades.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete trade:", error);
    return NextResponse.json({ error: "Failed to delete trade" }, { status: 500 });
  }
}

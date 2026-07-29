import { db } from "@/db";
import { trades, accountSettings } from "@/db/schema";
import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { InsightEngine, num } from "@/lib/insight-engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "summary";
    
    // Fetch all trades
    const allTrades = await db.select().from(trades).orderBy(desc(trades.entryDate));
    const engine = new InsightEngine(allTrades);
    
    // Fetch settings for balance
    const settings = await db.select().from(accountSettings);
    const startingBalance = settings.length > 0 ? num(settings[0].startingBalance) : 10000;

    switch (type) {
      case "summary":
        return NextResponse.json(engine.generateSummary());
      
      case "metrics":
        return NextResponse.json(engine.calculateMetrics());
      
      case "patterns":
        return NextResponse.json(engine.detectPatterns());
      
      case "confluences":
        return NextResponse.json(engine.analyzeConfluences());
      
      case "mistakes":
        return NextResponse.json(engine.analyzeMistakes());
      
      case "whatWorked":
        return NextResponse.json(engine.analyzeWhatWorked());
      
      case "decisionQuality":
        return NextResponse.json(engine.calculateDecisionQuality());
      
      case "playbook":
        return NextResponse.json(engine.generatePlaybook());
      
      case "calendar":
        return NextResponse.json(engine.generateCalendarData());
      
      case "equity":
        return NextResponse.json(engine.getEquityCurve(startingBalance));
      
      case "rDistribution":
        return NextResponse.json(engine.getRDistribution());
      
      case "dimension": {
        const dimension = searchParams.get("dimension") as "symbol" | "strategy" | "setup" | "session" | "timeframe" | "direction" | "marketType";
        if (!dimension) {
          return NextResponse.json({ error: "Dimension required" }, { status: 400 });
        }
        return NextResponse.json(engine.analyzeDimension(dimension));
      }
      
      case "byHour":
        return NextResponse.json(engine.analyzeByHour());
      
      case "byWeekday":
        return NextResponse.json(engine.analyzeByWeekday());
      
      case "periodReview": {
        const start = searchParams.get("start");
        const end = searchParams.get("end");
        const name = searchParams.get("name") || "Custom Period";
        if (!start || !end) {
          return NextResponse.json({ error: "Start and end dates required" }, { status: 400 });
        }
        const review = engine.generatePeriodReview(new Date(start), new Date(end), name);
        return NextResponse.json(review);
      }
      
      case "similarTrades": {
        const tradeId = searchParams.get("tradeId");
        if (!tradeId) {
          return NextResponse.json({ error: "Trade ID required" }, { status: 400 });
        }
        const trade = allTrades.find((t) => t.id === tradeId);
        if (!trade) {
          return NextResponse.json({ error: "Trade not found" }, { status: 404 });
        }
        return NextResponse.json(engine.findSimilarTrades(trade));
      }
      
      case "compareTrades": {
        const idA = searchParams.get("tradeA");
        const idB = searchParams.get("tradeB");
        if (!idA || !idB) {
          return NextResponse.json({ error: "Two trade IDs required" }, { status: 400 });
        }
        const tradeA = allTrades.find((t) => t.id === idA);
        const tradeB = allTrades.find((t) => t.id === idB);
        if (!tradeA || !tradeB) {
          return NextResponse.json({ error: "Trade(s) not found" }, { status: 404 });
        }
        return NextResponse.json(engine.compareTrades(tradeA, tradeB));
      }
      
      default:
        return NextResponse.json({ error: "Unknown insight type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Failed to generate insights:", error);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}

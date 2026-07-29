import { db } from "@/db";
import { trades } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/trades/bulk-delete?accountId=xxx  — delete all
// DELETE /api/trades/bulk-delete?accountId=xxx&from=2026-01-01&to=2026-07-31  — date range
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!accountId) {
      return NextResponse.json({ error: "accountId required" }, { status: 400 });
    }

    const conditions = [eq(trades.accountId, accountId)];
    if (from) conditions.push(gte(trades.entryDate, new Date(from)));
    if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(trades.entryDate, endDate));
    }

    const result = await db.delete(trades).where(and(...conditions));

    return NextResponse.json({ success: true, message: `Trades deleted` });
  } catch (error) {
    console.error("Bulk delete failed:", error);
    return NextResponse.json({ error: "Failed to delete trades" }, { status: 500 });
  }
}

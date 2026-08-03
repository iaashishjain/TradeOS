import { db } from "@/db";
import { trades, customOptions, playbooks, dailyReviews, tradeMedia, accountSettings } from "@/db/schema";
import { NextResponse } from "next/server";

const BACKUP_VERSION = 1;
const APP_ID = "tradeos";

function computeChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function GET() {
  try {
    const [
      allTrades,
      allCustomOptions,
      allPlaybooks,
      allReviews,
      allMedia,
      allSettings,
    ] = await Promise.all([
      db.select().from(trades),
      db.select().from(customOptions),
      db.select().from(playbooks),
      db.select().from(dailyReviews),
      db.select().from(tradeMedia),
      db.select().from(accountSettings),
    ]);

    const payload = {
      trades: allTrades,
      customOptions: allCustomOptions,
      playbooks: allPlaybooks,
      dailyReviews: allReviews,
      tradeMedia: allMedia,
      accountSettings: allSettings,
    };

    const payloadStr = JSON.stringify(payload);
    const checksum = computeChecksum(payloadStr);

    const backup = {
      _app: APP_ID,
      _version: BACKUP_VERSION,
      _createdAt: new Date().toISOString(),
      _checksum: checksum,
      _counts: {
        trades: allTrades.length,
        customOptions: allCustomOptions.length,
        playbooks: allPlaybooks.length,
        dailyReviews: allReviews.length,
        tradeMedia: allMedia.length,
        accountSettings: allSettings.length,
      },
      data: payload,
    };

    return NextResponse.json(backup);
  } catch (error) {
    console.error("Backup failed:", error);
    return NextResponse.json(
      { error: "Failed to create backup: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    );
  }
}

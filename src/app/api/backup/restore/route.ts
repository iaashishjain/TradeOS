import { db } from "@/db";
import { trades, customOptions, playbooks, dailyReviews, tradeMedia, accountSettings } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
// drizzle-orm imported tables used directly

const APP_ID = "tradeos";
const SUPPORTED_VERSIONS = [1];

function computeChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

interface BackupFile {
  _app: string;
  _version: number;
  _createdAt: string;
  _checksum: string;
  _counts: {
    trades: number;
    customOptions: number;
    playbooks: number;
    dailyReviews: number;
    tradeMedia: number;
    accountSettings: number;
  };
  data: {
    trades: Record<string, unknown>[];
    customOptions: Record<string, unknown>[];
    playbooks: Record<string, unknown>[];
    dailyReviews: Record<string, unknown>[];
    tradeMedia: Record<string, unknown>[];
    accountSettings: Record<string, unknown>[];
  };
}

// POST /api/backup/restore?mode=validate  — dry-run validation
// POST /api/backup/restore?mode=execute   — real restore
export async function POST(req: NextRequest) {
  const mode = new URL(req.url).searchParams.get("mode") || "validate";

  let backup: BackupFile;
  try {
    backup = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON file" }, { status: 400 });
  }

  // ── Validation ──
  const errors: string[] = [];

  if (backup._app !== APP_ID) {
    errors.push("This file is not a TradeOS backup");
  }
  if (!SUPPORTED_VERSIONS.includes(backup._version)) {
    errors.push(`Backup version ${backup._version} is not supported. Supported: ${SUPPORTED_VERSIONS.join(", ")}`);
  }
  if (!backup.data) {
    errors.push("Backup file is missing data payload");
  }
  if (!backup._checksum) {
    errors.push("Backup file is missing integrity checksum");
  }

  // Validate checksum
  if (backup._checksum && backup.data) {
    const payloadStr = JSON.stringify(backup.data);
    const expected = computeChecksum(payloadStr);
    if (expected !== backup._checksum) {
      errors.push("Backup file is corrupted — checksum mismatch");
    }
  }

  // Validate required tables
  const requiredTables = ["trades", "customOptions", "playbooks", "dailyReviews", "tradeMedia", "accountSettings"] as const;
  for (const table of requiredTables) {
    if (!backup.data?.[table] || !Array.isArray(backup.data[table])) {
      errors.push(`Missing or invalid table: ${table}`);
    }
  }

  // Validate record counts match metadata
  if (backup._counts && backup.data) {
    for (const table of requiredTables) {
      const expected = backup._counts[table] ?? 0;
      const actual = backup.data[table]?.length ?? 0;
      if (expected !== actual) {
        errors.push(`Record count mismatch for ${table}: expected ${expected}, found ${actual}`);
      }
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ valid: false, errors }, { status: 400 });
  }

  // Summary for validation mode
  const summary = {
    valid: true,
    createdAt: backup._createdAt,
    version: backup._version,
    counts: backup._counts,
  };

  if (mode === "validate") {
    return NextResponse.json(summary);
  }

  // ── Execute Restore ──
  try {
    // Use a transaction so failure rolls back automatically
    await db.transaction(async (tx) => {
      // Delete all existing data in dependency order
      await tx.delete(tradeMedia);
      await tx.delete(trades);
      await tx.delete(customOptions);
      await tx.delete(playbooks);
      await tx.delete(dailyReviews);
      await tx.delete(accountSettings);

      // Re-insert in dependency order
      for (const row of backup.data.accountSettings) {
        const r = deserializeRow(row, ["createdAt", "updatedAt"]);
        await tx.insert(accountSettings).values(r as never);
      }
      for (const row of backup.data.customOptions) {
        const r = deserializeRow(row, ["createdAt", "updatedAt"]);
        await tx.insert(customOptions).values(r as never);
      }
      for (const row of backup.data.playbooks) {
        const r = deserializeRow(row, ["createdAt", "updatedAt"]);
        await tx.insert(playbooks).values(r as never);
      }
      for (const row of backup.data.dailyReviews) {
        const r = deserializeRow(row, ["date", "createdAt", "updatedAt"]);
        await tx.insert(dailyReviews).values(r as never);
      }
      for (const row of backup.data.trades) {
        const r = deserializeRow(row, ["entryDate", "exitDate", "createdAt", "updatedAt"]);
        await tx.insert(trades).values(r as never);
      }
      for (const row of backup.data.tradeMedia) {
        const r = deserializeRow(row, ["createdAt"]);
        await tx.insert(tradeMedia).values(r as never);
      }
    });

    return NextResponse.json({
      success: true,
      restored: backup._counts,
      message: "All data restored successfully",
    });
  } catch (error) {
    console.error("Restore failed:", error);
    return NextResponse.json(
      {
        error: "Restore failed — database rolled back to previous state. " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}

function deserializeRow(
  row: Record<string, unknown>,
  dateFields: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...row };
  for (const field of dateFields) {
    if (result[field] && typeof result[field] === "string") {
      result[field] = new Date(result[field] as string);
    }
  }
  return result;
}

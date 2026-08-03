import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function check() {
  const { db } = await import("./src/db");
  const { trades } = await import("./src/db/schema");
  const { desc } = await import("drizzle-orm");

  const result = await db
    .select({
      id: trades.id,
      symbol: trades.symbol,
      screenshotBefore: trades.screenshotBefore,
      screenshotAfter: trades.screenshotAfter,
    })
    .from(trades)
    .orderBy(desc(trades.createdAt))
    .limit(5);

  console.log(
    result.map((t) => ({
      id: t.id,
      symbol: t.symbol,
      beforeExists: !!t.screenshotBefore,
      afterExists: !!t.screenshotAfter,
      beforeLength: t.screenshotBefore?.length || 0,
      afterLength: t.screenshotAfter?.length || 0,
    }))
  );

  process.exit();
}

check();

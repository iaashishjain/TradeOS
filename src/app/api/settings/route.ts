import { db } from "@/db";
import { accountSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET returns { accounts: [...], default: {...} }
export async function GET() {
  try {
    let all = await db.select().from(accountSettings);
    if (all.length === 0) {
      const [created] = await db
        .insert(accountSettings)
        .values({
          accountName: "Main Account",
          broker: "",
          startingBalance: "10000",
          currency: "USD",
          isDefault: true,
        })
        .returning();
      all = [created];
    }
    // Ensure at least one is default
    const hasDefault = all.some((a) => a.isDefault);
    if (!hasDefault && all.length > 0) {
      const [updated] = await db
        .update(accountSettings)
        .set({ isDefault: true })
        .where(eq(accountSettings.id, all[0].id))
        .returning();
      all[0] = updated;
    }
    const def = all.find((a) => a.isDefault) || all[0];
    return NextResponse.json({ accounts: all, default: def });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// POST creates a new account
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [created] = await db
      .insert(accountSettings)
      .values({
        accountName: body.accountName || "New Account",
        broker: body.broker || "",
        startingBalance: body.startingBalance || "10000",
        currency: body.currency || "USD",
        isDefault: false,
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create account:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}

// PUT updates an account
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    updates.updatedAt = new Date();
    const [updated] = await db
      .update(accountSettings)
      .set(updates)
      .where(eq(accountSettings.id, id))
      .returning();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

// DELETE removes an account (cannot delete default)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Check if default
    const [account] = await db.select().from(accountSettings).where(eq(accountSettings.id, id));
    if (account?.isDefault) {
      return NextResponse.json({ error: "Cannot delete the default account" }, { status: 400 });
    }

    await db.delete(accountSettings).where(eq(accountSettings.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete account:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}

// PATCH sets an account as default (unsets others)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;
    // Unset all defaults
    await db.update(accountSettings).set({ isDefault: false });
    // Set new default
    const [updated] = await db
      .update(accountSettings)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(accountSettings.id, id))
      .returning();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to set default:", error);
    return NextResponse.json({ error: "Failed to set default" }, { status: 500 });
  }
}

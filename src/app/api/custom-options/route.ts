import { db } from "@/db";
import { customOptions } from "@/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    
    let query = db.select().from(customOptions);
    
    if (type) {
      const all = await db
        .select()
        .from(customOptions)
        .where(eq(customOptions.type, type as "strategy" | "setup" | "what_worked" | "mistake" | "instrument"))
        .orderBy(desc(customOptions.usageCount));
      return NextResponse.json(all);
    }
    
    const all = await query.orderBy(desc(customOptions.usageCount));
    return NextResponse.json(all);
  } catch (error) {
    console.error("Failed to fetch custom options:", error);
    return NextResponse.json({ error: "Failed to fetch custom options" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Check if already exists
    const existing = await db
      .select()
      .from(customOptions)
      .where(
        and(
          eq(customOptions.type, body.type),
          eq(customOptions.value, body.value)
        )
      );
    
    if (existing.length > 0) {
      return NextResponse.json(existing[0]);
    }
    
    const [created] = await db
      .insert(customOptions)
      .values({
        type: body.type,
        value: body.value,
        color: body.color || null,
      })
      .returning();
    
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create custom option:", error);
    return NextResponse.json({ error: "Failed to create custom option" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    updates.updatedAt = new Date();
    
    const [updated] = await db
      .update(customOptions)
      .set(updates)
      .where(eq(customOptions.id, id))
      .returning();
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update custom option:", error);
    return NextResponse.json({ error: "Failed to update custom option" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    
    await db.delete(customOptions).where(eq(customOptions.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete custom option:", error);
    return NextResponse.json({ error: "Failed to delete custom option" }, { status: 500 });
  }
}

// Increment usage count
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;
    
    const [updated] = await db
      .update(customOptions)
      .set({
        usageCount: sql`${customOptions.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(customOptions.id, id))
      .returning();
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to increment usage:", error);
    return NextResponse.json({ error: "Failed to increment usage" }, { status: 500 });
  }
}

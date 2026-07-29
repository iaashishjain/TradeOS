import { db } from "@/db";
import { playbooks } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const all = await db
      .select()
      .from(playbooks)
      .orderBy(desc(playbooks.createdAt));
    return NextResponse.json(all);
  } catch (error) {
    console.error("Failed to fetch playbooks:", error);
    return NextResponse.json(
      { error: "Failed to fetch playbooks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [created] = await db
      .insert(playbooks)
      .values({
        name: body.name,
        description: body.description || null,
        marketType: body.marketType || null,
        rules: body.rules || [],
        entryConditions: body.entryConditions || [],
        exitConditions: body.exitConditions || [],
        riskManagement: body.riskManagement || null,
        timeframes: body.timeframes || [],
        isActive: body.isActive ?? true,
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create playbook:", error);
    return NextResponse.json(
      { error: "Failed to create playbook" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    updates.updatedAt = new Date();
    const [updated] = await db
      .update(playbooks)
      .set(updates)
      .where(eq(playbooks.id, id))
      .returning();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update playbook:", error);
    return NextResponse.json(
      { error: "Failed to update playbook" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    await db.delete(playbooks).where(eq(playbooks.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete playbook:", error);
    return NextResponse.json(
      { error: "Failed to delete playbook" },
      { status: 500 }
    );
  }
}

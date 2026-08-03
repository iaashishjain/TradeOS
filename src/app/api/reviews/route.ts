import { db } from "@/db";
import { dailyReviews } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const all = await db
      .select()
      .from(dailyReviews)
      .orderBy(desc(dailyReviews.date));
    return NextResponse.json(all);
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [created] = await db
      .insert(dailyReviews)
      .values({
        date: new Date(body.date),
        rating: body.rating,
        preMarketPlan: body.preMarketPlan || null,
        postMarketReview: body.postMarketReview || null,
        lessonsLearned: body.lessonsLearned || null,
        emotionalState: body.emotionalState || null,
        followedPlan: body.followedPlan ?? null,
        improvements: body.improvements || [],
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create review:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (updates.date) updates.date = new Date(updates.date);
    updates.updatedAt = new Date();
    const [updated] = await db
      .update(dailyReviews)
      .set(updates)
      .where(eq(dailyReviews.id, id))
      .returning();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update review:", error);
    return NextResponse.json(
      { error: "Failed to update review" },
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
    await db.delete(dailyReviews).where(eq(dailyReviews.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete review:", error);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
}

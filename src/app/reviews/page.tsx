"use client";

import { useState } from "react";
import { useReviews, useTrades } from "@/hooks/use-data";
import {
  PageShell,
  Card,
  Button,
  Badge,
  Modal,
  Input,
  Select,
  Textarea,
  EmptyState,
} from "@/components/ui";
import { formatCurrency, num, fmtDateFull } from "@/lib/calculations";
import { exportReviewsPDF } from "@/lib/pdf-export";
import { format } from "date-fns";
import type { DailyReview } from "@/db/schema";

const RATING_OPTIONS = [
  { value: "1", label: "1 — Terrible" },
  { value: "2", label: "2 — Poor" },
  { value: "3", label: "3 — Average" },
  { value: "4", label: "4 — Good" },
  { value: "5", label: "5 — Excellent" },
];

const EMOTION_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "calm", label: "Calm" },
  { value: "focused", label: "Focused" },
  { value: "confident", label: "Confident" },
  { value: "anxious", label: "Anxious" },
  { value: "frustrated", label: "Frustrated" },
  { value: "stressed", label: "Stressed" },
  { value: "excited", label: "Excited" },
];

const PLAN_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "partially", label: "Partially" },
];

const defaultForm = {
  date: format(new Date(), "yyyy-MM-dd"),
  rating: "3" as const,
  preMarketPlan: "",
  postMarketReview: "",
  lessonsLearned: "",
  emotionalState: "",
  followedPlan: "",
  improvements: "",
};

export default function ReviewsPage() {
  const { reviews, loading, createReview, updateReview, deleteReview } =
    useReviews();
  const { trades } = useTrades();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DailyReview | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const openModal = (review?: DailyReview) => {
    if (review) {
      setEditing(review);
      setForm({
        date: format(new Date(review.date), "yyyy-MM-dd"),
        rating: review.rating as typeof defaultForm.rating,
        preMarketPlan: review.preMarketPlan || "",
        postMarketReview: review.postMarketReview || "",
        lessonsLearned: review.lessonsLearned || "",
        emotionalState: review.emotionalState || "",
        followedPlan:
          review.followedPlan === true
            ? "yes"
            : review.followedPlan === false
            ? "no"
            : "",
        improvements:
          (review.improvements as string[])?.join("\n") || "",
      });
    } else {
      setEditing(null);
      setForm({
        ...defaultForm,
        date: format(new Date(), "yyyy-MM-dd"),
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        rating: form.rating,
        preMarketPlan: form.preMarketPlan || null,
        postMarketReview: form.postMarketReview || null,
        lessonsLearned: form.lessonsLearned || null,
        emotionalState: form.emotionalState || null,
        followedPlan:
          form.followedPlan === "yes"
            ? true
            : form.followedPlan === "no"
            ? false
            : null,
        improvements: form.improvements
          ? form.improvements.split("\n").map((s) => s.trim()).filter(Boolean)
          : [],
      };
      if (editing) {
        await updateReview({ id: editing.id, ...payload });
      } else {
        await createReview(payload);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this review?")) {
      await deleteReview(id);
    }
  };

  const getDayPnl = (date: string) => {
    const day = format(new Date(date), "yyyy-MM-dd");
    const dayTrades = trades.filter(
      (t) =>
        t.status === "closed" &&
        t.exitDate &&
        format(new Date(t.exitDate), "yyyy-MM-dd") === day
    );
    return {
      count: dayTrades.length,
      pnl: dayTrades.reduce((sum, t) => sum + num(t.pnl), 0),
    };
  };

  const ratingStars = (rating: string) => {
    const n = parseInt(rating);
    return "★".repeat(n) + "☆".repeat(5 - n);
  };

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <PageShell
      title="Daily Reviews"
      subtitle="Reflect on your trading day for continuous improvement"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={() => exportReviewsPDF(reviews, trades).catch((e: any) => alert('PDF Error: ' + e.message))}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Export PDF
          </Button>
          <Button onClick={() => openModal()}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Review
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <div className="h-32 animate-pulse bg-dark-700 rounded" />
            </Card>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
              </svg>
            }
            title="No reviews yet"
            description="Start reviewing your trading days to build discipline and learn from mistakes."
            action={<Button onClick={() => openModal()}>Write First Review</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => {
            const dayStats = getDayPnl(r.date as unknown as string);
            return (
              <Card
                key={r.id}
                className="hover:border-white/10 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-bold text-white">
                        {fmtDateFull(r.date)}
                      </h3>
                      <span className="text-warn text-sm">
                        {ratingStars(r.rating)}
                      </span>
                      {r.followedPlan !== null && (
                        <Badge variant={r.followedPlan ? "profit" : "loss"}>
                          {r.followedPlan ? "Followed Plan" : "Deviated"}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mb-3 text-sm">
                      <span className="text-dark-300">
                        {dayStats.count} trades
                      </span>
                      <span
                        className={
                          dayStats.pnl >= 0 ? "text-profit" : "text-loss"
                        }
                      >
                        {formatCurrency(dayStats.pnl)}
                      </span>
                      {r.emotionalState && (
                        <span className="text-dark-300">
                          Mood: {r.emotionalState}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {r.preMarketPlan && (
                        <div>
                          <span className="text-xs font-medium text-dark-400 uppercase">
                            Plan:{" "}
                          </span>
                          <span className="text-sm text-dark-200">
                            {r.preMarketPlan}
                          </span>
                        </div>
                      )}
                      {r.postMarketReview && (
                        <div>
                          <span className="text-xs font-medium text-dark-400 uppercase">
                            Review:{" "}
                          </span>
                          <span className="text-sm text-dark-200">
                            {r.postMarketReview}
                          </span>
                        </div>
                      )}
                      {r.lessonsLearned && (
                        <div>
                          <span className="text-xs font-medium text-dark-400 uppercase">
                            Lessons:{" "}
                          </span>
                          <span className="text-sm text-dark-200">
                            {r.lessonsLearned}
                          </span>
                        </div>
                      )}
                    </div>

                    {(r.improvements as string[])?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {(r.improvements as string[]).map((imp, i) => (
                          <Badge key={i} variant="accent">
                            {imp}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1 ml-4">
                    <button
                      onClick={() => openModal(r)}
                      className="p-1.5 rounded hover:bg-white/10 text-dark-400 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 rounded hover:bg-loss/10 text-dark-400 hover:text-loss transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit Review" : "New Daily Review"}
        wide
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => updateField("date", e.currentTarget.value)}
            />
            <Select
              label="Rating"
              options={RATING_OPTIONS}
              value={form.rating}
              onChange={(e) => updateField("rating", e.currentTarget.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Emotional State"
              options={EMOTION_OPTIONS}
              value={form.emotionalState}
              onChange={(e) =>
                updateField("emotionalState", e.currentTarget.value)
              }
            />
            <Select
              label="Followed Plan?"
              options={PLAN_OPTIONS}
              value={form.followedPlan}
              onChange={(e) =>
                updateField("followedPlan", e.currentTarget.value)
              }
            />
          </div>
          <Textarea
            label="Pre-Market Plan"
            value={form.preMarketPlan}
            onChange={(e) =>
              updateField("preMarketPlan", e.currentTarget.value)
            }
            placeholder="What is your plan for today?"
          />
          <Textarea
            label="Post-Market Review"
            value={form.postMarketReview}
            onChange={(e) =>
              updateField("postMarketReview", e.currentTarget.value)
            }
            placeholder="How did the day go?"
          />
          <Textarea
            label="Lessons Learned"
            value={form.lessonsLearned}
            onChange={(e) =>
              updateField("lessonsLearned", e.currentTarget.value)
            }
            placeholder="What did you learn today?"
          />
          <Textarea
            label="Improvements (one per line)"
            value={form.improvements}
            onChange={(e) =>
              updateField("improvements", e.currentTarget.value)
            }
            placeholder="Wait for confirmation&#10;Reduce position size&#10;Stick to plan"
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : editing ? "Update" : "Save Review"}
          </Button>
        </div>
      </Modal>
    </PageShell>
  );
}

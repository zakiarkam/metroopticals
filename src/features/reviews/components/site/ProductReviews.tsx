"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BadgeCheck, Loader2, MessageSquarePlus, Trash2 } from "lucide-react";
import { StarInput, StarRating } from "./StarRating";
import {
  deleteMyProductReview,
  getProductReviews,
  submitProductReview,
} from "@/features/reviews/api/review-api";
import type { Review, ReviewsResponse } from "@/features/reviews/types/review";
import { Toast } from "@/lib/utils/toast";

/**
 * Reviews on the product page.
 *
 * Customer-generated throughout: the shop cannot write these, only moderate
 * them. A submitted review is held for approval, which the form says plainly —
 * otherwise the customer posts, sees nothing appear, and posts again.
 */

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const STATUS_NOTE: Record<string, string> = {
  PENDING: "Your review is awaiting approval — only you can see it here.",
  REJECTED: "Your review was not approved. Edit it to submit again.",
  PUBLISHED: "Your review is live.",
};

function ReviewCard({ review, own = false }: { review: Review; own?: boolean }) {
  return (
    <article
      className={`rounded-2xl border p-5 ${
        own ? "border-blue/35 bg-blue-light-5" : "border-gray-3 bg-gray-2"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <StarRating value={review.rating} />

        <span className="text-[13.5px] font-bold text-dark">
          {own ? "Your review" : review.user?.name || "Verified customer"}
        </span>

        {review.verifiedPurchase && (
          <span className="inline-flex items-center gap-1 rounded-full border border-green/25 bg-green-light-6 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-green">
            <BadgeCheck className="h-3 w-3" />
            Verified purchase
          </span>
        )}

        <span className="ml-auto text-[12px] text-dark-5">
          {formatDate(review.createdAt)}
        </span>
      </div>

      {review.title && (
        <h4 className="mt-3 text-[15px] font-semibold text-dark">
          {review.title}
        </h4>
      )}

      <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-body">
        {review.body}
      </p>

      {own && review.status !== "PUBLISHED" && (
        <p className="mt-3 text-[12.5px] font-medium text-blue">
          {STATUS_NOTE[review.status]}
        </p>
      )}
    </article>
  );
}

export default function ProductReviews({
  productId,
  className = "",
}: {
  productId: number;
  className?: string;
}) {
  const { status: authStatus } = useSession();
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getProductReviews(productId, { limit: 20 });
      setData(result);

      // Seed the form from an existing review so the action reads as an edit.
      if (result.mine) {
        setRating(result.mine.rating);
        setTitle(result.mine.title ?? "");
        setBody(result.mine.body);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (rating < 1) {
      Toast.error("Pick a star rating first.");
      return;
    }
    if (body.trim().length < 10) {
      Toast.error("Tell us a little more — at least 10 characters.");
      return;
    }

    setSubmitting(true);
    const toastId = Toast.loading("Sending your review…");

    try {
      await submitProductReview(productId, {
        rating,
        title: title.trim() || null,
        body: body.trim(),
      });

      Toast.update(toastId, {
        render: "Thanks! Your review is awaiting approval.",
        type: "success",
        isLoading: false,
        autoClose: 4000,
        closeButton: true,
      });

      setFormOpen(false);
      await load();
    } catch (error: any) {
      Toast.update(toastId, {
        render:
          error?.response?.data?.message ||
          error?.message ||
          "Could not send your review.",
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm("Remove your review?")) return;

    try {
      await deleteMyProductReview(productId);
      setRating(0);
      setTitle("");
      setBody("");
      Toast.success("Your review was removed.");
      await load();
    } catch {
      Toast.error("Could not remove your review.");
    }
  };

  const summary = data?.summary;
  const mine = data?.mine ?? null;
  const signedIn = authStatus === "authenticated";

  return (
    <section className={className} id="reviews">
      <div className="rounded-3xl border border-gray-3 bg-gray-1 p-6 sm:p-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[1.5rem] font-bold tracking-[-0.03em] text-dark sm:text-[1.85rem]">
              Customer reviews
            </h2>
            <p className="mt-1 text-[13.5px] text-dark-4">
              Written by people who bought this frame.
            </p>
          </div>

          {signedIn ? (
            <button
              type="button"
              onClick={() => setFormOpen((open) => !open)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue px-6 text-[14px] font-bold text-white transition-colors hover:bg-blue-dark"
            >
              <MessageSquarePlus className="h-4 w-4" />
              {mine ? "Edit your review" : "Write a review"}
            </button>
          ) : (
            <Link
              href="/log-in"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-4 px-6 text-[14px] font-bold text-dark transition-colors hover:border-blue hover:text-blue"
            >
              Sign in to review
            </Link>
          )}
        </div>

        {/* ------------------------------ summary ------------------------- */}
        {summary && summary.total > 0 && (
          <div className="mt-7 grid gap-6 rounded-2xl border border-gray-3 bg-gray-2 p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-10">
            <div className="text-center sm:text-left">
              <p className="font-display text-[2.8rem] font-bold leading-none text-dark">
                {summary.average?.toFixed(1)}
              </p>
              <StarRating value={summary.average} size={18} className="mt-2" />
              <p className="mt-1.5 text-[12.5px] text-dark-4">
                {summary.total} review{summary.total === 1 ? "" : "s"}
              </p>
            </div>

            <div className="space-y-1.5 self-center">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const count = summary.distribution[star] ?? 0;
                const percent = summary.total
                  ? Math.round((count / summary.total) * 100)
                  : 0;

                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="w-8 shrink-0 text-[12px] font-semibold text-dark-4">
                      {star}★
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-3">
                      <span
                        className="block h-full rounded-full bg-blue-light"
                        style={{ width: `${percent}%` }}
                      />
                    </span>
                    <span className="w-8 shrink-0 text-right text-[12px] text-dark-5">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------- form --------------------------- */}
        {signedIn && formOpen && (
          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4 rounded-2xl border border-blue/30 bg-gray-2 p-5"
          >
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-dark">
                Your rating
              </p>
              <StarInput value={rating} onChange={setRating} />
            </div>

            <div>
              <label
                htmlFor="review-title"
                className="mb-1.5 block text-[13px] font-semibold text-dark"
              >
                Headline <span className="font-normal text-dark-4">(optional)</span>
              </label>
              <input
                id="review-title"
                type="text"
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Comfortable and light"
                className="w-full rounded-xl border border-gray-3 bg-gray-1 px-4 py-2.5 text-[14px] text-dark outline-none focus:border-blue"
              />
            </div>

            <div>
              <label
                htmlFor="review-body"
                className="mb-1.5 block text-[13px] font-semibold text-dark"
              >
                Your review
              </label>
              <textarea
                id="review-body"
                rows={4}
                value={body}
                maxLength={2000}
                onChange={(e) => setBody(e.target.value)}
                placeholder="How is the fit, the finish, the lenses?"
                className="w-full resize-y rounded-xl border border-gray-3 bg-gray-1 px-4 py-3 text-[14px] leading-relaxed text-dark outline-none focus:border-blue"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue px-7 text-[14px] font-bold text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {mine ? "Update review" : "Submit review"}
              </button>

              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="h-11 rounded-xl border border-gray-3 px-5 text-[14px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
              >
                Cancel
              </button>

              {mine && (
                <button
                  type="button"
                  onClick={handleWithdraw}
                  className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-semibold text-dark-4 transition-colors hover:text-red"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}

              <p className="w-full text-[12px] text-dark-4">
                Reviews are checked before they appear on the site.
              </p>
            </div>
          </form>
        )}

        {/* ------------------------------- list --------------------------- */}
        <div className="mt-7 space-y-4">
          {loading ? (
            <div className="grid h-24 place-items-center text-dark-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <>
              {mine && <ReviewCard review={mine} own />}

              {(data?.reviews ?? [])
                .filter((review) => review.id !== mine?.id)
                .map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}

              {!mine && !data?.reviews.length && (
                <p className="rounded-2xl border border-dashed border-gray-3 px-6 py-10 text-center text-[14px] text-dark-4">
                  No reviews yet — be the first to rate this frame.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

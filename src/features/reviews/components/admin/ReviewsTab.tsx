"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Loader2, Search, Trash2, X } from "lucide-react";
import { StarRating } from "../site/StarRating";
import {
  deleteAdminReview,
  getAdminReviews,
  setAdminReviewStatus,
} from "@/features/reviews/api/review-api";
import type { Review, ReviewStatus } from "@/features/reviews/types/review";
import { getProductImageUrl } from "@/lib/storageUtils";
import { Toast } from "@/lib/utils/toast";

/**
 * Review moderation.
 *
 * Staff approve, reject or delete — they never author. Pending is the default
 * filter because that is the only state that needs anyone's attention; the
 * others are there for going back over a decision.
 */

const TABS: { value: ReviewStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "PUBLISHED", label: "Published" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

const STATUS_STYLES: Record<ReviewStatus, string> = {
  PENDING: "border-orange/25 bg-orange-light-5 text-orange",
  PUBLISHED: "border-green/25 bg-green-light-6 text-green",
  REJECTED: "border-red/25 bg-red-light-6 text-red",
};

export default function ReviewsTab() {
  const [tab, setTab] = useState<ReviewStatus | "ALL">("PENDING");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminReviews({
        limit: 50,
        status: tab === "ALL" ? undefined : tab,
        search: debounced || undefined,
      });
      setReviews(result.reviews);
      setPendingCount(result.pendingCount);
    } catch {
      Toast.error("Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }, [tab, debounced]);

  useEffect(() => {
    void load();
  }, [load]);

  const moderate = async (review: Review, status: ReviewStatus) => {
    setBusyId(review.id);
    try {
      await setAdminReviewStatus(review.id, status);
      Toast.success(
        status === "PUBLISHED" ? "Review published." : "Review rejected."
      );
      await load();
    } catch {
      Toast.error("Could not update the review.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (review: Review) => {
    if (!window.confirm("Delete this review permanently?")) return;

    setBusyId(review.id);
    try {
      await deleteAdminReview(review.id);
      Toast.success("Review deleted.");
      await load();
    } catch {
      Toast.error("Could not delete the review.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[24px] font-bold tracking-tight text-dark">
          Reviews
        </h2>
        <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-dark-4">
          Customer-written reviews awaiting a decision. Publishing one adds it to
          the product page and updates that product&apos;s star rating.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-3 bg-gray-2 p-3">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-gray-3 bg-gray-1 p-1">
          {TABS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTab(option.value)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-[12.5px] font-semibold transition-colors ${
                tab === option.value
                  ? "bg-gray-2 text-blue shadow-1"
                  : "text-dark-4 hover:text-dark"
              }`}
            >
              {option.label}
              {option.value === "PENDING" && pendingCount > 0 && (
                <span className="rounded-full bg-orange px-1.5 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reviews or products…"
            className="h-10 w-full rounded-xl border border-gray-3 bg-gray-1 pl-10 pr-4 text-[13.5px] text-dark outline-none focus:border-blue"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center text-dark-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-3 px-6 py-14 text-center text-[14px] text-dark-4">
          Nothing here.
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const image = getProductImageUrl(review.product?.images?.[0]);
            const busy = busyId === review.id;

            return (
              <article
                key={review.id}
                className="rounded-2xl border border-gray-3 bg-gray-2 p-5"
              >
                <div className="flex flex-wrap items-start gap-4">
                  {review.product && (
                    <Link
                      href={`/shop-details/${review.product.id}`}
                      target="_blank"
                      className="flex min-w-0 items-center gap-3"
                    >
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-1">
                        {image && (
                          <Image
                            src={image}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold text-dark">
                          {review.product.title}
                        </span>
                        <span className="block text-[12px] text-dark-4">
                          {review.user?.name || "Customer"} ·{" "}
                          {new Date(review.createdAt).toLocaleDateString("en-LK")}
                        </span>
                      </span>
                    </Link>
                  )}

                  <div className="ml-auto flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${STATUS_STYLES[review.status]}`}
                    >
                      {review.status.toLowerCase()}
                    </span>
                    {review.verifiedPurchase && (
                      <span className="rounded-full border border-green/25 bg-green-light-6 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-green">
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <StarRating value={review.rating} />
                  {review.title && (
                    <h4 className="mt-2 text-[15px] font-semibold text-dark">
                      {review.title}
                    </h4>
                  )}
                  <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-body">
                    {review.body}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {review.status !== "PUBLISHED" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => moderate(review, "PUBLISHED")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-green px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Publish
                    </button>
                  )}

                  {review.status !== "REJECTED" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => moderate(review, "REJECTED")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-3 px-4 text-[13px] font-semibold text-dark transition-colors hover:border-red hover:text-red disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(review)}
                    className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-dark-4 transition-colors hover:text-red disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

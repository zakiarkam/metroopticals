"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Loader2,
  MessageSquarePlus,
  Quote,
  Trash2,
} from "lucide-react";
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
 * them. A submitted review is held for approval, which the form says plainly
 * otherwise the customer posts, sees nothing appear, and posts again.
 */

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const STATUS_NOTE: Record<string, string> = {
  PENDING: "Your review is awaiting approval  only you can see it here.",
  REJECTED: "Your review was not approved. Edit it to submit again.",
  PUBLISHED: "Your review is live.",
};

/**
 * One review as a testimonial card.
 *
 * Deliberately has no avatar and no company mark: the shop does not collect
 * either, and a row of generated initials was filler pretending to be identity.
 * What is real  the rating, whether they actually bought the frame, and when
 * carries the card instead.
 *
 * The headline is the reviewer's own title where they wrote one, so the large
 * type is always a customer's words rather than a truncation of their sentence.
 */
function ReviewCard({
  review,
  own = false,
}: {
  review: Review;
  own?: boolean;
}) {
  const headline = review.title?.trim() || review.body;
  const detail = review.title?.trim() ? review.body : null;

  return (
    <article
      className={`flex w-[290px] max-w-[calc(100vw-3rem)] shrink-0 snap-start flex-col rounded-2xl border p-5 sm:w-[360px] sm:max-w-none sm:p-7 ${
        own ? "border-blue/40 bg-blue-light-5" : "border-gray-3 bg-gray-2"
      }`}
    >
      <Quote
        aria-hidden
        className="h-7 w-7 shrink-0 fill-blue-light-2 text-blue-light-2"
      />

      <StarRating value={review.rating} size={15} className="mt-5" />

      <p className="mt-4 break-words font-display text-[1.25rem] font-bold leading-[1.25] tracking-[-0.02em] text-dark sm:text-[1.4rem]">
        {headline}
      </p>

      {detail && (
        <p className="mt-3 line-clamp-5 whitespace-pre-line text-[13.5px] leading-relaxed text-body">
          {detail}
        </p>
      )}

      {own && review.status !== "PUBLISHED" && (
        <p className="mt-4 text-[12.5px] font-semibold text-blue">
          {STATUS_NOTE[review.status]}
        </p>
      )}

      {/* Pushed to the bottom so cards of different lengths line their
          attribution up along one baseline. */}
      <div className="mt-auto border-l-2 border-blue-light/60 pl-4 pt-8">
        <p className="text-[14px] font-bold text-dark">
          {own ? "Your review" : review.user?.name || "Verified customer"}
        </p>

        {review.verifiedPurchase && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-green">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified purchase
          </p>
        )}

        <p className="mt-1 text-[12px] text-dark-5">
          {formatDate(review.createdAt)}
        </p>
      </div>
    </article>
  );
}

/** The panel shown before anyone has reviewed the frame. */
function ReviewsEmpty({ action }: { action: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-3 bg-gray-2 px-6 py-12 text-center sm:px-10 sm:py-16">
      <Quote
        aria-hidden
        className="mx-auto h-9 w-9 fill-blue-light-2 text-blue-light-2"
      />
      <p className="mt-6 font-display text-[1.3rem] font-bold leading-tight tracking-[-0.02em] text-dark sm:text-[1.6rem]">
        No reviews yet.
        <br />
        <span className="text-blue-light">Yours would be the first.</span>
      </p>
      <p className="mx-auto mt-3.5 max-w-md text-[14px] leading-relaxed text-body">
        How does it sit on the nose? Is it lighter than it looks? The next
        person deciding on this frame is reading for exactly that.
      </p>
      <div className="mt-7 flex justify-center">{action}</div>
    </div>
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
  const railRef = React.useRef<HTMLDivElement>(null);

  /** Scrolls the rail by one card plus its gap, clamped by the browser. */
  const scrollRail = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.firstElementChild as HTMLElement | null;
    const step = (card?.offsetWidth ?? 320) + 16;
    rail.scrollBy({ left: direction * step, behavior: "smooth" });
  };

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
      Toast.error("Tell us a little more  at least 10 characters.");
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

  // The customer's own review leads the rail, then everyone else's. Filtering
  // by id rather than by author keeps a pending review from appearing twice.
  const others = (data?.reviews ?? []).filter(
    (review) => review.id !== mine?.id,
  );
  const visibleCount = others.length + (mine ? 1 : 0);

  return (
    <section className={className} id="reviews">
      <div className="border-t border-gray-3 pt-10 sm:pt-12">
        {/* Heading left, controls right  the arrows only earn their place
            once there is more than one card to move between. */}
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h2 className="font-display text-[1.7rem] font-bold leading-[1.1] tracking-[-0.035em] text-dark sm:text-[2.1rem]">
              Customer <span className="text-blue-light">reviews</span>
            </h2>
            <p className="mt-2 text-[14px] text-dark-4">
              Written by people who bought this frame.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {signedIn ? (
              <button
                type="button"
                onClick={() => setFormOpen((open) => !open)}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-blue px-6 text-[12.5px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-blue-dark"
              >
                <MessageSquarePlus className="h-4 w-4" />
                {mine ? "Edit your review" : "Write a review"}
              </button>
            ) : (
              <Link
                href="/log-in"
                className="inline-flex h-11 items-center rounded-full border border-gray-4 px-6 text-[12.5px] font-bold uppercase tracking-[0.12em] text-dark transition-colors hover:border-blue hover:text-blue"
              >
                Sign in to review
              </Link>
            )}

            {visibleCount > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollRail(-1)}
                  aria-label="Previous reviews"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-dark text-white transition-colors hover:bg-blue"
                >
                  <ArrowLeft className="h-[18px] w-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRail(1)}
                  aria-label="Next reviews"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-dark text-white transition-colors hover:bg-blue"
                >
                  <ArrowRight className="h-[18px] w-[18px]" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------ summary ------------------------- */}
        {summary && summary.total > 0 && (
          <div className="mt-8 grid gap-8 border-y border-gray-3 py-7 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-12">
            <div>
              <div className="flex items-end gap-3">
                <p className="font-display text-[2.5rem] font-bold leading-none tracking-[-0.04em] text-dark sm:text-[3rem]">
                  {summary.average?.toFixed(1)}
                </p>
                <span className="pb-1.5 text-[14px] font-medium text-dark-5">
                  / 5
                </span>
              </div>
              <StarRating value={summary.average} size={17} className="mt-3" />
              <p className="mt-2 text-[12.5px] text-dark-4">
                {summary.total} review{summary.total === 1 ? "" : "s"}
              </p>
            </div>

            <div className="max-w-md space-y-1.5 self-center">
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
                Headline{" "}
                <span className="font-normal text-dark-4">(optional)</span>
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
        <div className="mt-8">
          {loading ? (
            <div className="grid h-32 place-items-center text-dark-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : visibleCount === 0 ? (
            <ReviewsEmpty
              action={
                signedIn ? (
                  <button
                    type="button"
                    onClick={() => setFormOpen(true)}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-blue px-7 text-[12.5px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-blue-dark"
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                    Write the first review
                  </button>
                ) : (
                  <Link
                    href="/log-in"
                    className="inline-flex h-11 items-center rounded-full border border-gray-4 px-7 text-[12.5px] font-bold uppercase tracking-[0.12em] text-dark transition-colors hover:border-blue hover:text-blue"
                  >
                    Sign in to review
                  </Link>
                )
              }
            />
          ) : (
            /*
             * A scroll-snap rail rather than a library carousel: it is a few
             * lines of CSS, it stays swipeable on touch with no JS, and the
             * arrows above simply scroll it. `-mx-*` + matching padding lets
             * the cards bleed to the viewport edge on a phone.
             */
            <div
              ref={railRef}
              className="-mx-4 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
            >
              {mine && <ReviewCard review={mine} own />}
              {others.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

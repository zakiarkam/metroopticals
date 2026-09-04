import Link from "next/link";
import { ArrowRight, Glasses, MessageCircle } from "lucide-react";

import { formatPrice } from "@/lib/utils/price";

export type GuideLensPricing = {
  id: number;
  priceFrom: number;
  /** Which builds the shop offers this coating in. */
  designKinds: string[];
  tints: { id: number; name: string; hex: string | null; surcharge: number }[];
};

const DESIGN_LABELS: Record<string, string> = {
  SINGLE_VISION: "Single vision",
  BIFOCAL: "Bifocal",
  PROGRESSIVE: "Progressive",
};

/**
 * The buy panel on a lens guide page.
 *
 * A lens cannot be bought on its own - it is ground to a prescription and
 * fitted into a frame - so the call to action is not "add to basket", it is
 * "choose the frame you want this in". The slug rides along in the link so
 * the shop knows which lens the customer came for and the lens picker opens
 * on it, instead of asking them to find it again in a list of nine.
 *
 * With no price on file the panel says so rather than inventing a figure, and
 * points at the people who can quote it.
 */
export default function LensCtaPanel({
  slug,
  lensName,
  pricing,
  whatsappHref,
}: {
  slug: string;
  lensName: string;
  pricing?: GuideLensPricing;
  whatsappHref: string;
}) {
  const cheapestTint = pricing?.tints.length
    ? Math.min(...pricing.tints.map((tint) => tint.surcharge))
    : 0;

  return (
    <div className="rounded-2xl border border-blue/25 bg-blue/[0.06] p-5 sm:p-6">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-blue">
        <Glasses className="h-4 w-4" />
        Get this lens
      </p>

      {pricing && pricing.priceFrom > 0 ? (
        <>
          <p className="mt-3 flex flex-wrap items-baseline gap-2">
            <span className="text-[11.5px] font-semibold uppercase tracking-wide text-dark-5">
              From
            </span>
            <span className="font-display text-[30px] font-bold leading-none tracking-[-0.02em] text-dark">
              {formatPrice(pricing.priceFrom + cheapestTint)}
            </span>
            <span className="text-[12.5px] text-dark-5">the pair</span>
          </p>

          <p className="mt-2.5 text-[13px] leading-relaxed text-body">
            Your own price depends on the powers on your prescription - stronger
            lenses are cut from a different blank and cost more. You will see
            the exact figure before you pay, never after.
          </p>
        </>
      ) : (
        <p className="mt-3 text-[13.5px] leading-relaxed text-body">
          We fit {lensName.toLowerCase()} to order. Tell us your prescription
          and we will quote it the same day.
        </p>
      )}

      {/* Bifocal and progressive are not other lenses, they are other ways of
          building this one - so they belong on this lens's page rather than
          sending the reader off to compare two things that are not
          alternatives. */}
      {pricing && pricing.designKinds.length > 0 && (
        <div className="mt-4">
          <p className="text-[11.5px] font-semibold text-dark-4">
            Available as
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {pricing.designKinds.map((kind) => (
              <li
                key={kind}
                className="rounded-full border border-gray-3 bg-white px-2.5 py-1 text-[11.5px] font-medium text-dark-2"
              >
                {DESIGN_LABELS[kind] ?? kind}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pricing && pricing.tints.length > 0 && (
        <div className="mt-4">
          <p className="text-[11.5px] font-semibold text-dark-4">
            Available in {pricing.tints.length} colours
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {pricing.tints.map((tint) => (
              <li
                key={tint.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-3 bg-white px-2.5 py-1 text-[11.5px] font-medium text-dark-2"
              >
                <span
                  aria-hidden
                  className="h-3 w-3 rounded-full ring-1 ring-inset ring-dark/15"
                  style={{ background: tint.hex ?? "#d1d5db" }}
                />
                {tint.name}
                {tint.surcharge > 0 && (
                  <span className="text-dark-5">
                    +{formatPrice(tint.surcharge)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2.5">
        {pricing ? (
          <Link
            href={`/shop-with-sidebar?lens=${slug}`}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue px-6 text-[14px] font-bold text-white transition-colors hover:bg-blue-dark"
          >
            Choose a frame for this lens
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link
            href={whatsappHref}
            target="_blank"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue px-6 text-[14px] font-bold text-white transition-colors hover:bg-blue-dark"
          >
            <MessageCircle className="h-4 w-4" />
            Ask us for a price
          </Link>
        )}

        <Link
          href="/contact"
          className="inline-flex h-12 items-center rounded-xl border border-gray-3 bg-white px-5 text-[13.5px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
        >
          Book an eye test
        </Link>
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-dark-5">
        Pick your frame, then add your prescription - type it in, upload a photo
        of it, or use one we already have on file.
      </p>
    </div>
  );
}

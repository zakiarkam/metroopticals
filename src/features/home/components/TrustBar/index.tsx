import React from "react";
import { Eye, ShieldCheck, Sparkles, Truck } from "lucide-react";

/**
 * Reassurance strip directly under the hero.
 *
 * Sits between the hero and the catalogue so the four things customers ask
 * about most (fit, lens quality, delivery, aftercare) are answered before they
 * start browsing.
 */

const PROMISES = [
  {
    icon: Eye,
    title: "Free eye test",
    copy: "20-minute check with our optometrist, no appointment needed.",
  },
  {
    icon: Sparkles,
    title: "Lenses fitted in-store",
    copy: "Anti-glare, blue-light and UV coatings cut on our own edger.",
  },
  {
    icon: Truck,
    title: "Island-wide delivery",
    copy: "Dispatched within 2 working days, tracked to your door.",
  },
  {
    icon: ShieldCheck,
    title: "12-month warranty",
    copy: "Free adjustments and nose-pad replacements for life.",
  },
];

export default function TrustBar() {
  return (
    <section className="border-y border-gray-3 bg-gray-2">
      <div className="mx-auto w-full max-w-[1560px] px-4 sm:px-6 lg:px-10">
        <ul className="grid grid-cols-1 divide-y divide-gray-3 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
          {PROMISES.map(({ icon: Icon, title, copy }, i) => (
            <li
              key={title}
              className={`flex items-start gap-4 py-6 sm:py-7 lg:px-7 ${
                i > 0 ? "lg:border-l lg:border-gray-3" : "lg:pl-0"
              } ${i === 1 ? "sm:border-l sm:border-gray-3 sm:pl-7" : ""} ${
                i === 3 ? "sm:border-l sm:border-gray-3 sm:pl-7" : ""
              } ${i > 1 ? "sm:border-t sm:border-gray-3 lg:border-t-0" : ""}`}
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue/25 bg-blue/10 text-blue">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-dark">{title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-body">
                  {copy}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

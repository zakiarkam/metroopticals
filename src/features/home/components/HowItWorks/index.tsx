import React from "react";
import { Section, SectionHeading } from "@/components/common/Section";

/**
 * Four-step explainer for the order journey.
 *
 * Buying prescription eyewear online is unfamiliar to most customers  the
 * question "what actually happens after I pay?" is the main hesitation, so it
 * gets answered on the home page rather than buried in the FAQ.
 */

const STEPS = [
  {
    title: "Pick your frame",
    copy: "Browse by shape, brand or budget. Every listing carries the lens, bridge and temple measurements so you can compare against a pair you already own.",
  },
  {
    title: "Add your prescription",
    copy: "Enter it at checkout, upload a photo of it later, or book a free 20-minute eye test with our optometrist and we will fill it in for you.",
  },
  {
    title: "We cut the lenses",
    copy: "Your lenses are surfaced, coated and edged to your frame at our Colombo lab, then checked on a focimeter before they leave the bench.",
  },
  {
    title: "Fitted or delivered",
    copy: "Collect in store for a free fitting and alignment, or have them delivered island-wide within 1–3 working days, fully tracked.",
  },
];

export default function HowItWorks() {
  return (
    <Section>
      <SectionHeading
        eyebrow="How it works"
        title="From frame to fitting"
        titleAccent="in four steps."
        description="No guesswork and no hidden lab fees  here is exactly what happens once you place an order."
      />

      {/*
       * Ghost numerals on a hairline rather than numbered pills inside a
       * bordered grid  the same treatment the lens guides use, so the two
       * "here is how it works" sections on the site read as one system.
       *
       * An earlier attempt at ghost numerals set them at 7% opacity on ivory
       * and they came out as smudges; `text-gray-3` is a solid warm tone at
       * full opacity, which is why this one is legible.
       */}
      <ol className="grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="border-t border-gray-3 pt-6">
            <span
              aria-hidden
              className="block font-display text-[3.25rem] font-bold leading-none tracking-[-0.04em] text-gray-3"
            >
              {String(i + 1).padStart(2, "0")}
            </span>

            <h3 className="mt-5 text-[15px] font-bold leading-snug text-dark">
              {step.title}
            </h3>
            <p className="mt-2.5 text-[14px] leading-relaxed text-body">
              {step.copy}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

import React from "react";
import { Section, SectionHeading } from "@/components/common/Section";

/**
 * Four-step explainer for the order journey.
 *
 * Buying prescription eyewear online is unfamiliar to most customers — the
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
        title="From frame to fitting in four steps"
        description="No guesswork and no hidden lab fees — here is exactly what happens once you place an order."
      />

      <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-gray-3 bg-gray-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="group relative bg-gray-2 p-7 transition-colors duration-300 hover:bg-gray-8"
          >
            {/* oversized step number, sunk into the surface */}
            <span
              aria-hidden
              className="absolute right-5 top-3 select-none text-[3.4rem] font-bold leading-none text-dark/[0.07] transition-colors duration-300 group-hover:text-blue/20"
            >
              {i + 1}
            </span>

            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue/40 text-[13px] font-bold text-blue">
              {i + 1}
            </span>

            <h3 className="relative mt-5 text-[16px] font-bold text-dark">
              {step.title}
            </h3>
            <p className="relative mt-2.5 text-[13.5px] leading-relaxed text-body">
              {step.copy}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

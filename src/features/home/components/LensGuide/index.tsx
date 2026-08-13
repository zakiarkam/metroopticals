import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Contrast,
  Glasses,
  Layers,
  MonitorSmartphone,
  Sun,
} from "lucide-react";
import { Section, SectionHeading } from "@/components/common/Section";

/**
 * Lens education block.
 *
 * Frames are the easy part of the decision; lenses are where customers stall
 * and abandon. This lays out the four lens types we cut in-store, plus the
 * coatings included as standard, so the choice is made before checkout.
 */

const LENSES = [
  {
    icon: Glasses,
    name: "Single vision",
    lead: "One prescription across the whole lens",
    copy: "For distance or reading. The default choice, and ready in 2–3 working days.",
  },
  {
    icon: Layers,
    name: "Progressive",
    lead: "Distance, middle and reading in one",
    copy: "No visible line. Digitally surfaced for a wider corridor and less swim at the edges.",
  },
  {
    icon: MonitorSmartphone,
    name: "Blue-light",
    lead: "Built for screen-heavy days",
    copy: "Filters high-energy visible light to cut the late-afternoon eye strain and glare.",
  },
  {
    icon: Sun,
    name: "Photochromic",
    lead: "Clear indoors, tinted outdoors",
    copy: "Darkens in UV within seconds and clears again inside. One pair for everything.",
  },
];

const COATINGS = [
  "Anti-glare",
  "Scratch resistant",
  "UV400 protection",
  "Water repellent",
  "Anti-static",
];

export default function LensGuide() {
  return (
    <Section tone="raised">
      <SectionHeading
        eyebrow="Lens guide"
        title="The lens matters more than the frame"
        description="Every pair is cut, edged and fitted at our own lab in Colombo — so we can tell you exactly what you are getting."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LENSES.map(({ icon: Icon, name, lead, copy }) => (
          <div
            key={name}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 p-6 transition-colors duration-300 hover:border-blue/45"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
            />

            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-blue/25 bg-blue/10 text-blue">
              <Icon className="h-[22px] w-[22px]" />
            </span>

            <h3 className="mt-5 text-[16px] font-bold text-dark">{name}</h3>
            <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-blue/85">
              {lead}
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-body">{copy}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-5 rounded-2xl border border-gray-3 bg-gray-2 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-blue">
            <Contrast className="h-4 w-4" />
            Included on every lens
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {COATINGS.map((coating) => (
              <li
                key={coating}
                className="rounded-full border border-gray-4 bg-gray-8 px-3 py-1.5 text-[12px] font-medium text-dark-3"
              >
                {coating}
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/contact"
          className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-blue/40 px-6 py-3 text-[13px] font-bold text-blue transition-colors hover:bg-blue hover:text-gray-1"
        >
          Ask about your prescription
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </Section>
  );
}

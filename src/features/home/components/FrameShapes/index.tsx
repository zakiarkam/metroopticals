import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Section, SectionHeading } from "@/components/common/Section";

/**
 * "Shop by frame shape" — a browsing entry point that doesn't depend on the
 * category data in the database.
 *
 * Each shape is drawn as inline SVG rather than shipped as a photo: the outline
 * is the whole point, it stays crisp at any size, and it costs no requests.
 */

type Shape = {
  name: string;
  suits: string;
  query: string;
  draw: React.ReactNode;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Bridge + temple arms shared by every shape, so they read as one family. */
const Bridge = () => (
  <>
    <path d="M52 30 q8 -6 16 0" {...stroke} />
    <path d="M6 27 L2 22" {...stroke} />
    <path d="M114 27 L118 22" {...stroke} />
  </>
);

const SHAPES: Shape[] = [
  {
    name: "Rectangle",
    suits: "Round & oval faces",
    query: "rectangle",
    draw: (
      <>
        <rect x="6" y="18" width="46" height="26" rx="6" {...stroke} />
        <rect x="68" y="18" width="46" height="26" rx="6" {...stroke} />
        <Bridge />
      </>
    ),
  },
  {
    name: "Round",
    suits: "Square & angular faces",
    query: "round",
    draw: (
      <>
        <circle cx="29" cy="31" r="23" {...stroke} />
        <circle cx="91" cy="31" r="23" {...stroke} />
        <Bridge />
      </>
    ),
  },
  {
    name: "Cat-eye",
    suits: "Heart & oval faces",
    query: "cat-eye",
    draw: (
      <>
        <path d="M6 26 q4 18 23 18 q23 0 23 -20 q-24 -8 -46 2 Z" {...stroke} />
        <path d="M114 26 q-4 18 -23 18 q-23 0 -23 -20 q24 -8 46 2 Z" {...stroke} />
        <Bridge />
      </>
    ),
  },
  {
    name: "Aviator",
    suits: "Oval & square faces",
    query: "aviator",
    draw: (
      <>
        <path d="M6 20 h46 q0 26 -20 28 q-22 2 -26 -28 Z" {...stroke} />
        <path d="M114 20 h-46 q0 26 20 28 q22 2 26 -28 Z" {...stroke} />
        <Bridge />
      </>
    ),
  },
  {
    name: "Square",
    suits: "Round & heart faces",
    query: "square",
    draw: (
      <>
        <rect x="8" y="14" width="44" height="34" rx="5" {...stroke} />
        <rect x="68" y="14" width="44" height="34" rx="5" {...stroke} />
        <Bridge />
      </>
    ),
  },
  {
    name: "Rimless",
    suits: "Any face shape",
    query: "rimless",
    draw: (
      <>
        <path d="M6 22 h46 v14 q-23 10 -46 0 Z" {...stroke} strokeDasharray="7 6" />
        <path d="M114 22 h-46 v14 q23 10 46 0 Z" {...stroke} strokeDasharray="7 6" />
        <Bridge />
      </>
    ),
  },
];

export default function FrameShapes() {
  return (
    <Section>
      <SectionHeading
        eyebrow="Find your fit"
        title="Shop by frame shape"
        description="Not sure where to start? Pick the silhouette that flatters your face — our team will fine-tune the fit in store."
        href="/shop-with-sidebar"
        hrefLabel="All frames"
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
        {SHAPES.map((shape) => (
          <Link
            key={shape.name}
            href={`/shop-without-sidebar?search=${encodeURIComponent(shape.query)}`}
            className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 px-4 py-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-blue/45 hover:shadow-gold"
          >
            <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-gray-4 transition-colors group-hover:text-blue" />

            <svg
              viewBox="0 0 120 62"
              className="h-auto w-full max-w-[110px] text-dark-3 transition-colors duration-300 group-hover:text-blue"
              aria-hidden
            >
              {shape.draw}
            </svg>

            <div>
              <p className="text-[13.5px] font-bold text-dark">{shape.name}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-dark-5">
                {shape.suits}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, Minus } from "lucide-react";

import PageHero from "@/components/common/PageHero";
import SiteContainer from "@/components/common/SiteContainer";
import LensTile from "@/features/lenses/components/LensTile";
import { LensIcon } from "@/features/lenses/components/lens-icons";
import {
  ConsultBand,
  NumberedSteps,
  PillLink,
  SectionIntro,
} from "@/components/common/editorial";
import { getGuideLensPricing } from "@/features/lenses/services/lens-service";
import { getLensType, lensTypes } from "@/config/lenses";
import { buildSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Lens Types",
  description:
    "Every lens type we fit at Metro Opticals  uncoated, blue cut, blue filter, photochromic, polarized, bifocal, progressive, Neo Vision and Omega. What each one does, who it suits, and what it will not do.",
  alternates: { canonical: buildSiteUrl("/lenses") },
  openGraph: {
    title: "Lens Types | Metro Opticals",
    description:
      "A plain-English guide to every spectacle lens we fit  what each type does, who it suits, and its honest limitations.",
    url: buildSiteUrl("/lenses"),
    images: [{ url: buildSiteUrl("/images/lenses/guide.jpg") }],
  },
};

/** slug → how much room that lens gets in the grid. Order is the reading order. */
const LAYOUT: { slug: string; span: string; size: "lg" | "md" | "sm" }[] = [
  { slug: "blue-cut", span: "lg:col-span-7", size: "lg" },
  { slug: "photochromic", span: "lg:col-span-5", size: "lg" },
  { slug: "progressive", span: "lg:col-span-4", size: "md" },
  { slug: "polarized", span: "lg:col-span-4", size: "md" },
  { slug: "blue-filter", span: "lg:col-span-4", size: "md" },
  { slug: "bifocal", span: "lg:col-span-5", size: "md" },
  { slug: "uncoated", span: "lg:col-span-7", size: "md" },
  { slug: "neo-vision", span: "lg:col-span-6", size: "sm" },
  { slug: "omega", span: "lg:col-span-6", size: "sm" },
];

const CHOOSING_STEPS = [
  {
    title: "Start with your day",
    body: "Hours at a screen, long drives after dark, most of the day outdoors, or small print up close. The right lens follows from how you actually spend your time.",
  },
  {
    title: "Settle the vision first",
    body: "One power or several? Whether you need single vision, a bifocal or a progressive is decided before any coating or tint is discussed.",
  },
  {
    title: "Then choose the finish",
    body: "Coating, filter and tint are the last decision, not the first. This is where uncoated, blue cut, blue filter, photochromic and polarised separate.",
  },
  {
    title: "Come in and be measured",
    body: "Pupillary distance and fitting height are taken in the frame you have chosen. A progressive cannot be made accurately without them.",
  },
];

/** The comparison grid. Kept narrow on purpose  four honest columns beat ten. */
const COMPARE_COLUMNS = [
  { key: "screens", label: "Screens" },
  { key: "sun", label: "Bright sun" },
  { key: "night", label: "Night driving" },
  { key: "reading", label: "Reading + distance" },
] as const;

const COMPARE: Record<
  string,
  Record<(typeof COMPARE_COLUMNS)[number]["key"], boolean>
> = {
  uncoated: { screens: false, sun: false, night: false, reading: false },
  "blue-cut": { screens: true, sun: false, night: true, reading: false },
  "blue-filter": { screens: true, sun: false, night: true, reading: false },
  photochromic: { screens: false, sun: true, night: false, reading: false },
  polarized: { screens: false, sun: true, night: false, reading: false },
  bifocal: { screens: false, sun: false, night: false, reading: true },
  progressive: { screens: true, sun: false, night: false, reading: true },
};

export default async function LensesPage() {
  // The shop's live price list. The guide reads perfectly well without it, so
  // a lens nobody has priced simply shows no figure rather than a placeholder.
  const pricing = await getGuideLensPricing();

  const tiles = LAYOUT.map((entry) => ({
    ...entry,
    lens: getLensType(entry.slug),
  })).filter(
    (entry): entry is typeof entry & { lens: NonNullable<typeof entry.lens> } =>
      Boolean(entry.lens),
  );

  const compared = lensTypes.filter((lens) => COMPARE[lens.slug]);

  return (
    <>
      <PageHero
        eyebrow="Lens guide"
        title="Lens types we fit"
        description="Nine lens types, what each one actually does, who it suits  and, just as usefully, what it will not do."
        crumbs={[{ label: "Lenses" }]}
      />

      {/* ------------------------------- intro ------------------------------- */}
      <section className="border-b border-gray-3 bg-gray-2 py-12 lg:py-16">
        <SiteContainer>
          <SectionIntro
            eyebrow="Where to start"
            title="The frame is what people see."
            titleAccent="The lens is what you see through."
            body="Two people can walk out in the same frame and have a completely different experience of wearing it, because the lens inside is doing a different job. Each guide covers how the lens works, who it suits, and the limitations we would rather you knew before you bought than after."
            action={
              <PillLink href="/contact">Ask us which lens suits you</PillLink>
            }
          />

          <div className="relative mt-12 aspect-[21/9] overflow-hidden rounded-2xl bg-gray-1">
            <Image
              src="/images/lenses/guide.jpg"
              alt="An overhead flat lay of spectacle lenses in nine different finishes on warm ivory linen"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </SiteContainer>
      </section>

      {/* ------------------------------ the grid ------------------------------ */}
      <section className="bg-gray-1 py-12 lg:py-16">
        <SiteContainer>
          <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <span className="mb-3 inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.24em] text-blue">
                <span className="h-px w-7 bg-blue/50" />
                The range
              </span>
              <h2 className="font-display text-[1.7rem] font-bold leading-[1.1] tracking-[-0.035em] text-dark sm:text-[2.1rem]">
                Nine lenses, nine different jobs
              </h2>
            </div>
            <p className="max-w-sm text-[14px] leading-relaxed text-body">
              Grouped by what they are for clear and coated, screen and indoor,
              sun and outdoor, multifocal, and our two premium ranges.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
            {tiles.map(({ lens, span, size }, index) => (
              <div key={lens.slug} className={span}>
                <LensTile
                  lens={lens}
                  size={size}
                  priority={index < 2}
                  priceFrom={pricing.get(lens.slug)?.priceFrom}
                />
              </div>
            ))}
          </div>
        </SiteContainer>
      </section>

      {/* --------------------------- how to choose --------------------------- */}
      <section className="border-y border-gray-3 bg-gray-2 py-12 lg:py-16">
        <SiteContainer>
          <SectionIntro
            eyebrow="How to choose"
            title="Four questions,"
            titleAccent="in this order."
            body="Most people start at the coating and work backwards, which is how you end up with a lens that is beautifully finished and wrong for your eyes. This is the order we work in at the counter."
            className="mb-12"
          />
          <NumberedSteps steps={CHOOSING_STEPS} />
        </SiteContainer>
      </section>

      {/* ---------------------------- comparison ---------------------------- */}
      <section className="bg-gray-1 py-12 lg:py-16">
        <SiteContainer>
          <div className="max-w-2xl">
            <span className="mb-3 inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.24em] text-blue">
              <span className="h-px w-7 bg-blue/50" />
              At a glance
            </span>
            <h2 className="font-display text-[1.7rem] font-bold leading-[1.1] tracking-[-0.035em] text-dark sm:text-[2.1rem]">
              Which lens for which problem
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-body">
              A tick means the lens is a genuinely good answer to that problem
              not merely that it can be worn while doing it. Our two premium
              ranges are left out because they are materials and coatings rather
              than a lens function.
            </p>
          </div>

          {/* Wide table on a narrow phone scrolls inside its own box rather
              than pushing the page sideways. */}
          <div className="mt-9 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-y border-gray-3">
                  <th
                    scope="col"
                    className="py-3.5 pr-5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-dark-5"
                  >
                    Lens type
                  </th>
                  {COMPARE_COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className="px-5 py-3.5 text-center text-[10.5px] font-bold uppercase tracking-[0.16em] text-dark-5"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compared.map((lens) => (
                  <tr
                    key={lens.slug}
                    className="border-b border-gray-3 transition-colors hover:bg-blue-light-5"
                  >
                    <th scope="row" className="py-4 pr-5 text-left font-normal">
                      <Link
                        href={`/lenses/${lens.slug}`}
                        className="inline-flex items-center gap-2.5 text-[14px] font-semibold text-dark transition-colors hover:text-blue"
                      >
                        <LensIcon
                          name={lens.icon}
                          className="h-4 w-4 shrink-0 text-blue"
                        />
                        {lens.shortName}
                      </Link>
                    </th>
                    {COMPARE_COLUMNS.map((column) => (
                      <td key={column.key} className="px-5 py-4 text-center">
                        {COMPARE[lens.slug][column.key] ? (
                          <>
                            <Check
                              aria-hidden
                              className="mx-auto h-4.5 w-4.5 text-green"
                            />
                            <span className="sr-only">Yes</span>
                          </>
                        ) : (
                          <>
                            <Minus
                              aria-hidden
                              className="mx-auto h-4 w-4 text-gray-4"
                            />
                            <span className="sr-only">No</span>
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SiteContainer>
      </section>

      {/* -------------------------------- band -------------------------------- */}
      <ConsultBand
        eyebrow="Not sure?"
        title="Tell us how you"
        titleAccent="spend your day."
        body="Send us your prescription and a sentence about how you live, and we will tell you what we would fit  including when the cheaper lens is the right one. Or come in and let us measure properly."
        image="/images/store/consult.jpg"
        imageAlt="An optician fitting a pair of spectacles onto a smiling customer in the store"
        primary={{ href: "/contact", label: "Book an eye test" }}
        secondary={{ href: "/faq", label: "Read the FAQ" }}
      />
    </>
  );
}

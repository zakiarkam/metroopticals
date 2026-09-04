import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Check, ChevronDown, Info } from "lucide-react";

import PageHero from "@/components/common/PageHero";
import SiteContainer from "@/components/common/SiteContainer";
import LensRow from "@/features/lenses/components/LensRow";
import { LensIcon } from "@/features/lenses/components/lens-icons";
import {
  ConsultBand,
  NumberedSteps,
  SectionIntro,
} from "@/components/common/editorial";
import LensCtaPanel from "@/features/lenses/components/LensCtaPanel";
import { getGuideLensPricing } from "@/features/lenses/services/lens-service";
import { getLensType } from "@/config/lenses";
import { buildSiteUrl, jsonLdScript } from "@/lib/seo";
import { siteConfig } from "@/config/site";

type LensPageProps = { params: Promise<{ slug: string }> };

/** Spec-strip column counts, written out so Tailwind keeps the classes. */
const SPEC_COLUMNS: Record<number, string> = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

export async function generateMetadata({
  params,
}: LensPageProps): Promise<Metadata> {
  const { slug } = await params;
  const lens = getLensType(slug);
  if (!lens) return { title: "Lens not found" };

  const url = buildSiteUrl(`/lenses/${lens.slug}`);
  const description = `${lens.tagline} ${lens.intro[0]}`.slice(0, 300);

  return {
    title: lens.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${lens.name} | Metro Opticals`,
      description,
      url,
      images: [{ url: buildSiteUrl(lens.image) }],
    },
  };
}

export default async function LensDetailPage({ params }: LensPageProps) {
  const { slug } = await params;
  const lens = getLensType(slug);
  if (!lens) notFound();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  // The shop's live price list, so the guide can quote a real "from" figure
  // rather than sending an interested reader to the contact form.
  const pricing = (await getGuideLensPricing()).get(lens.slug);

  const related = lens.compareWith
    .map((relatedSlug) => getLensType(relatedSlug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  // Rich result for the questions at the foot of the page. Only the FAQ block
  // is marked up  the guide copy itself is prose, not a structured recipe.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: lens.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer.join(" ") },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd) }}
      />

      <PageHero
        eyebrow={lens.group}
        title={lens.name}
        description={lens.tagline}
        crumbs={[
          { label: "Lenses", href: "/lenses" },
          { label: lens.shortName },
        ]}
      />

      {/* ------------------------- photograph + intro ------------------------- */}
      <section className="bg-gray-2 pb-12 pt-10 lg:pb-16 lg:pt-14">
        <SiteContainer>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-14">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-gray-1">
              <Image
                src={lens.image}
                alt={lens.imageAlt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
              />
            </div>

            <div>
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-blue">
                <LensIcon name={lens.icon} className="h-4 w-4" />
                {lens.group}
              </span>

              <div className="mt-5 space-y-4 text-[16px] leading-relaxed text-body">
                {lens.intro.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-8">
                <LensCtaPanel
                  slug={lens.slug}
                  lensName={lens.name}
                  pricing={pricing}
                  whatsappHref={`https://wa.me/${siteConfig.contact.whatsapp}`}
                />
              </div>
            </div>
          </div>
        </SiteContainer>
      </section>

      {/* ----------------------------- spec strip ----------------------------- */}
      <section className="border-y border-gray-3 bg-gray-1">
        <SiteContainer className="py-8">
          {/* Column count follows the number of specs so the strip is one full
              row  a fixed five left a lone sixth entry stranded underneath. */}
          <dl
            className={`grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:divide-x lg:divide-gray-3 ${
              SPEC_COLUMNS[lens.specs.length] ?? "lg:grid-cols-4"
            }`}
          >
            {lens.specs.map((spec, index) => (
              <div key={spec.label} className={index > 0 ? "lg:pl-8" : ""}>
                <dt className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-dark-5">
                  {spec.label}
                </dt>
                <dd className="mt-2 font-display text-[15px] font-bold leading-snug tracking-[-0.01em] text-dark">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>

          {lens.supplierRange && (
            <p className="mt-7 border-t border-gray-3 pt-5 text-[13.5px] leading-relaxed text-dark-4">
              <Info className="mr-2 inline-block h-4 w-4 -translate-y-px text-blue" />
              This is a stocked supplier range. We publish no index or price
              figures for it here because those change between production series
              ask us and you will get the current answer for your prescription.
            </p>
          )}
        </SiteContainer>
      </section>

      {/* ---------------------------- how it works ---------------------------- */}
      <section className="bg-gray-2 py-12 lg:py-16">
        <SiteContainer>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-start lg:gap-16">
            <div>
              <span className="mb-4 block text-[11px] font-bold uppercase tracking-[0.24em] text-blue">
                How it works
              </span>
              <h2 className="font-display text-[1.7rem] font-bold leading-[1.1] tracking-[-0.035em] text-dark sm:text-[2.1rem]">
                What is actually
                <br />
                <span className="text-blue-light">happening in the lens</span>
              </h2>

              <div className="mt-6 space-y-4 text-[15.5px] leading-relaxed text-body">
                {lens.howItWorks.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>

            <figure className="lg:sticky lg:top-28">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-1">
                <Image
                  src={lens.imageInUse}
                  alt={lens.imageInUseAlt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-3.5 text-[13px] leading-relaxed text-dark-5">
                {lens.imageInUseAlt}.
              </figcaption>
            </figure>
          </div>
        </SiteContainer>
      </section>

      {/* ------------------------------ benefits ------------------------------ */}
      <section className="border-y border-gray-3 bg-gray-1 py-12 lg:py-16">
        <SiteContainer>
          <SectionIntro
            eyebrow="Why people choose it"
            title="What you get"
            titleAccent="for the money."
            className="mb-12"
          />
          <NumberedSteps
            steps={lens.benefits.map((benefit) => ({
              title: benefit.title,
              body: benefit.body,
            }))}
            columns={lens.benefits.length === 3 ? 3 : 4}
          />
        </SiteContainer>
      </section>

      {/* ------------------------------- variants ------------------------------- */}
      {lens.variants && (
        <section className="bg-gray-2 py-12 lg:py-16">
          <SiteContainer>
            <div className="max-w-2xl">
              <span className="mb-3 inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.24em] text-blue">
                <span className="h-px w-7 bg-blue/50" />
                Colours
              </span>
              <h2 className="font-display text-[1.7rem] font-bold leading-[1.1] tracking-[-0.035em] text-dark sm:text-[2.1rem]">
                {lens.variants.title}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-body">
                {lens.variants.description}
              </p>
            </div>

            <ul className="mt-10 grid grid-cols-1 gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {lens.variants.items.map((variant) => (
                <li key={variant.name} className="border-t border-gray-3 pt-6">
                  {/* The disc is the tint itself, so an inset ring rather than
                      a border keeps a pale tint from vanishing on ivory. */}
                  <span
                    aria-hidden
                    className="block h-14 w-14 rounded-full shadow-2 ring-1 ring-inset ring-dark/15"
                    style={{ backgroundColor: variant.hex }}
                  />
                  <h3 className="mt-5 font-display text-[1.05rem] font-bold tracking-[-0.02em] text-dark">
                    {variant.name}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-body">
                    {variant.summary}
                  </p>
                </li>
              ))}
            </ul>
          </SiteContainer>
        </section>
      )}

      {/* ------------------------------- best for ------------------------------- */}
      <section className="border-t border-gray-3 bg-gray-2 py-12 lg:py-16">
        <SiteContainer>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div>
              <span className="mb-3 inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.24em] text-blue">
                <span className="h-px w-7 bg-blue/50" />
                Best for
              </span>
              <h2 className="font-display text-[1.7rem] font-bold leading-[1.1] tracking-[-0.035em] text-dark sm:text-[2rem]">
                Who we fit
                <br />
                <span className="text-blue-light">this lens to</span>
              </h2>
            </div>

            <ul className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
              {lens.bestFor.map((item) => (
                <li
                  key={item}
                  className="flex gap-3.5 border-b border-gray-3 py-4"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                  <span className="text-[14.5px] leading-relaxed text-body">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </SiteContainer>
      </section>

      {/* ----------------------------- good to know ----------------------------- */}
      <section className="bg-blue-light-5 py-12 lg:py-16">
        <SiteContainer>
          <div className="max-w-2xl">
            <span className="mb-3 inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.24em] text-blue">
              <span className="h-px w-7 bg-blue/50" />
              Good to know
            </span>
            <h2 className="font-display text-[1.7rem] font-bold leading-[1.1] tracking-[-0.035em] text-dark sm:text-[2.1rem]">
              The things a brochure
              <br />
              <span className="text-blue-light">would leave out.</span>
            </h2>
          </div>

          <ul className="mt-9 grid grid-cols-1 gap-x-12 gap-y-1 md:grid-cols-2">
            {lens.goodToKnow.map((item) => (
              <li
                key={item}
                className="flex gap-3.5 border-b border-blue-light-3 py-5"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
                <span className="text-[14.5px] leading-relaxed text-dark-3">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </SiteContainer>
      </section>

      {/* --------------------------------- faqs --------------------------------- */}
      <section className="bg-gray-2 py-12 lg:py-16">
        <SiteContainer>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div>
              <span className="mb-3 inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.24em] text-blue">
                <span className="h-px w-7 bg-blue/50" />
                Questions
              </span>
              <h2 className="font-display text-[1.7rem] font-bold leading-[1.1] tracking-[-0.035em] text-dark sm:text-[2rem]">
                What people ask
                <br />
                <span className="text-blue-light">at the counter</span>
              </h2>
            </div>

            <div className="border-t border-gray-3">
              {lens.faqs.map((faq, index) => (
                <details
                  key={faq.question}
                  open={index === 0}
                  className="group border-b border-gray-3"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[15.5px] font-semibold text-dark transition-colors hover:text-blue">
                    {faq.question}
                    <ChevronDown className="h-5 w-5 shrink-0 text-blue transition-transform duration-300 group-open:-rotate-180" />
                  </summary>
                  <div className="space-y-3 pb-6 pr-10 text-[14.5px] leading-relaxed text-body">
                    {faq.answer.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </SiteContainer>
      </section>

      {/* --------------------------------- band --------------------------------- */}
      <ConsultBand
        eyebrow="Before you buy"
        title="Send us your prescription."
        titleAccent="We will be straight with you."
        body="We will tell you whether this lens is genuinely right for your eyes and your day  including the times the cheaper option is the better one. Or book an eye test and we will measure properly."
        image="/images/store/consult.jpg"
        imageAlt="An optician fitting a pair of spectacles onto a smiling customer in the store"
        primary={{ href: "/contact", label: "Book an eye test" }}
        secondary={{ href: "/lenses", label: "All lens types" }}
      />

      {/* ------------------------------- compare ------------------------------- */}
      {related.length > 0 && (
        <section className="bg-gray-1 py-12 lg:py-16">
          <SiteContainer>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
              <div>
                <span className="mb-3 inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.24em] text-blue">
                  <span className="h-px w-7 bg-blue/50" />
                  Compare
                </span>
                <h2 className="font-display text-[1.7rem] font-bold leading-[1.1] tracking-[-0.035em] text-dark sm:text-[2rem]">
                  Worth weighing
                  <br />
                  <span className="text-blue-light">this against</span>
                </h2>
              </div>

              <div className="border-t border-gray-3">
                {related.map((item) => (
                  <LensRow key={item.slug} lens={item} />
                ))}
              </div>
            </div>
          </SiteContainer>
        </section>
      )}
    </>
  );
}

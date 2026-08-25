import { Metadata } from "next";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

import SiteContainer from "@/components/common/SiteContainer";
import PageHero from "@/components/common/PageHero";
import {
  ConsultBand,
  PillLink,
  SectionIntro,
} from "@/components/common/editorial";
import { faqs } from "@/config/faqs";
import { buildSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about Metro Opticals  eyewear range, prescriptions, eye tests, delivery times, warranty and payment options.",
  alternates: { canonical: buildSiteUrl("/faq") },
};

export default function FAQPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer.join(" ") },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <PageHero
        eyebrow="Help centre"
        title="Frequently asked questions"
        description="From choosing the right frame to understanding your prescription  the questions our customers ask most."
        crumbs={[{ label: "FAQ" }]}
      />

      {/* ------------------------------- intro ------------------------------- */}
      <section className="border-b border-gray-3 bg-gray-2 py-12 lg:py-16">
        <SiteContainer>
          <SectionIntro
            eyebrow="Before you ask"
            title="Most answers are here."
            titleAccent="The rest, just call us."
            body="Prescriptions, eye tests, lead times, warranty and delivery  the things people ring the shop about most often, answered properly rather than in one line. If yours is not here, the store will pick up."
            action={<PillLink href="/contact">Send us a message</PillLink>}
          />

          <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-2xl bg-gray-1 sm:mt-12 sm:aspect-[21/9]">
            <Image
              src="/images/store/consult.jpg"
              alt="An optician fitting a pair of spectacles onto a smiling customer in the store"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </SiteContainer>
      </section>

      {/* ------------------------------ questions ------------------------------ */}
      <section className="bg-gray-1 py-12 lg:py-16">
        <SiteContainer>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
            <div>
              <span className="mb-3 inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.24em] text-blue">
                <span className="h-px w-7 bg-blue/50" />
                Questions
              </span>
              <h2 className="font-display text-[1.7rem] font-bold leading-[1.1] tracking-[-0.035em] text-dark sm:text-[2rem]">
                Everything people
                <br />
                <span className="text-blue-light">ask at the counter</span>
              </h2>
              <p className="mt-4 max-w-sm text-[14.5px] leading-relaxed text-body">
                {faqs.length} questions, answered by the people who actually cut
                and fit the lenses.
              </p>
            </div>

            <div className="border-t border-gray-3">
              {faqs.map((faq, index) => (
                <details
                  key={faq.question}
                  open={index === 0}
                  className="group border-b border-gray-3"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[15px] font-semibold text-dark transition-colors hover:text-blue sm:gap-6 sm:text-[15.5px]">
                    {faq.question}
                    <ChevronDown className="h-5 w-5 shrink-0 text-blue transition-transform duration-300 group-open:-rotate-180" />
                  </summary>
                  <div className="space-y-3 pb-6 text-[14.5px] leading-relaxed text-body sm:pr-10">
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

      {/* -------------------------------- band -------------------------------- */}
      <ConsultBand
        eyebrow="Still stuck?"
        title="Talk to someone"
        titleAccent="who fits lenses daily."
        body="Call the store, message us on WhatsApp, or book a free eye test. If the question is about your prescription, bring it in  five minutes at the counter beats twenty on the phone."
        image="/images/store/eye-test.jpg"
        imageAlt="A phoropter eye-testing instrument in a warm, dimly lit consulting room"
        primary={{ href: "/contact", label: "Book an eye test" }}
        secondary={{ href: "/lenses", label: "Read the lens guide" }}
      />
    </>
  );
}

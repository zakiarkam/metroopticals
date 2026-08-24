import { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import SiteContainer from "@/components/common/SiteContainer";
import PageHero from "@/components/common/PageHero";
import ContactChannels from "@/components/common/ContactChannels";
import { faqs } from "@/config/faqs";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about Metro Opticals — eyewear range, prescriptions, eye tests, delivery times, warranty and payment options.",
};

/**
 * FAQ page. Questions live in `@/config/faqs` so the home-page preview and this
 * full list stay in sync.
 */
export default function FAQPage() {
  return (
  <>
    <PageHero
      eyebrow="Help centre"
      title="Frequently asked questions"
      description="From choosing the right frame to understanding your prescription — the questions our customers ask most."
      crumbs={[{ label: "FAQ" }]}
    />

    <div className="bg-gray-1 py-10 lg:py-14">
      <SiteContainer>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
          {/* --------------------------- questions --------------------------- */}
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <details
                key={faq.question}
                open={index === 0}
                className="group rounded-2xl border border-gray-3 bg-gray-2 px-6 shadow-2 transition-colors duration-300 open:border-blue/40 hover:border-blue/30"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[15px] font-semibold text-dark sm:text-[16px]">
                  {faq.question}
                  <ChevronDown className="h-5 w-5 shrink-0 text-blue transition-transform duration-300 group-open:-rotate-180" />
                </summary>
                <div className="space-y-3 border-t border-gray-3 pb-6 pt-4 text-[14px] leading-relaxed text-body">
                  {faq.answer.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>

          {/* ---------------------------- help rail ---------------------------- */}
          <aside
            className="lg:sticky lg:self-start"
            style={{ top: "calc(var(--site-header-height, 132px) + 1.5rem)" }}
          >
            <div className="overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 shadow-2">
              <div className="border-b border-gray-3 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue">
                  Still stuck?
                </p>
                <h2 className="mt-1.5 text-lg font-bold text-dark">
                  Talk to our team
                </h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-body">
                  Call or message us to book an eye test, check frame
                  availability, or ask about your prescription.
                </p>
              </div>

              <ContactChannels only={["phone", "email", "whatsapp"]} />

              <div className="border-t border-gray-3 p-6">
                <Link
                  href="/contact"
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue text-[13px] font-bold text-white transition-colors hover:bg-blue-dark"
                >
                  Send us a message
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </SiteContainer>
    </div>
  </>
  );
}

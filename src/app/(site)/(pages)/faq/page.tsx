import { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, Mail, MessageCircle, Phone } from "lucide-react";

import SiteContainer from "@/components/common/SiteContainer";
import PageHero from "@/components/common/PageHero";
import { siteConfig } from "@/config/site";
import { faqs } from "@/config/faqs";

/**
 * FAQ page. Questions live in `@/config/faqs` so the home-page preview and this
 * full list stay in sync.
 */
const FAQPage = () => (
  <>
    <PageHero
      eyebrow="Help centre"
      title="Frequently asked questions"
      description="From choosing the right frame to understanding your prescription — the questions our customers ask most."
      crumbs={[{ label: "FAQ" }]}
    />

    <section className="bg-gray-1 py-10 lg:py-14">
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
          <aside className="lg:sticky lg:top-32">
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

              <ul className="divide-y divide-gray-3">
                {[
                  {
                    icon: Phone,
                    label: "Phone",
                    value: siteConfig.contact.phone,
                    href: siteConfig.contact.phoneHref,
                  },
                  {
                    icon: Mail,
                    label: "Email",
                    value: siteConfig.contact.email,
                    href: `mailto:${siteConfig.contact.email}`,
                  },
                  {
                    icon: MessageCircle,
                    label: "WhatsApp",
                    value: "Message the store",
                    href: `https://wa.me/${siteConfig.contact.whatsapp}`,
                  },
                ].map(({ icon: Icon, label, value, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="group flex items-start gap-3.5 px-6 py-4 transition-colors hover:bg-gray-8"
                    >
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue/25 bg-blue/10 text-blue">
                        <Icon className="h-[17px] w-[17px]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-dark-5">
                          {label}
                        </span>
                        <span className="mt-0.5 block break-all text-[14px] font-semibold text-dark transition-colors group-hover:text-blue">
                          {value}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>

              <div className="border-t border-gray-3 p-6">
                <Link
                  href="/contact"
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue text-[13px] font-bold text-gray-1 transition-colors hover:bg-blue-light"
                >
                  Send us a message
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </SiteContainer>
    </section>
  </>
);

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about Metro Opticals — eyewear range, prescriptions, eye tests, delivery times, warranty and payment options.",
};

export default FAQPage;

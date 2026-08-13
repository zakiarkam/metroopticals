import React from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Section, SectionHeading } from "@/components/common/Section";
import { faqs } from "@/config/faqs";

/** First four questions from the shared FAQ list, with a link to the rest. */
export default function FaqPreview() {
  return (
    <Section>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading
            eyebrow="Good to know"
            title="Questions we get asked most"
            description="Prescriptions, turnaround times, warranty and returns — the short answers."
            className="mb-6"
          />

          <Link
            href="/faq"
            className="group inline-flex items-center gap-2 rounded-full border border-gray-3 bg-gray-2 px-5 py-2.5 text-[13px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
          >
            Read all FAQs
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {faqs.slice(0, 4).map((faq, index) => (
            <details
              key={faq.question}
              open={index === 0}
              className="group rounded-2xl border border-gray-3 bg-gray-2 px-6 transition-colors duration-300 open:border-blue/40 hover:border-blue/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[15px] font-semibold text-dark">
                {faq.question}
                <ChevronDown className="h-5 w-5 shrink-0 text-blue transition-transform duration-300 group-open:-rotate-180" />
              </summary>
              <div className="space-y-3 border-t border-gray-3 pb-6 pt-4 text-[13.5px] leading-relaxed text-body">
                {faq.answer.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}

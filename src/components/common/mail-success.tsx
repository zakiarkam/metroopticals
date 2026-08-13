import React from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";

import SiteContainer from "@/components/common/SiteContainer";

const MailSuccess = () => (
  <section className="relative overflow-hidden bg-gray-1 py-16 lg:py-24">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[380px]"
      style={{
        background:
          "radial-gradient(55% 70% at 50% 0%, rgba(192,156,108,0.14) 0%, transparent 70%)",
      }}
    />

    <SiteContainer className="relative">
      <div className="mx-auto max-w-xl rounded-3xl border border-gray-3 bg-gray-2 p-8 text-center shadow-3 sm:p-12">
        <span className="mx-auto mb-7 inline-flex h-16 w-16 items-center justify-center rounded-full border border-green/30 bg-green/10 text-green">
          <MailCheck className="h-8 w-8" />
        </span>

        <h1 className="text-[1.6rem] font-bold tracking-tight text-dark sm:text-[2rem]">
          Message sent
        </h1>

        <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-body">
          Thank you for getting in touch. We check email throughout the day and
          will reply within one working day.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue px-7 text-[14px] font-bold text-gray-1 transition-colors hover:bg-blue-light"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <Link
            href="/shop-with-sidebar"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-3 px-7 text-[14px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
          >
            Keep browsing
          </Link>
        </div>
      </div>
    </SiteContainer>
  </section>
);

export default MailSuccess;

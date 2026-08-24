import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Search } from "lucide-react";

import SiteContainer from "@/components/common/SiteContainer";

const Error = () => (
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
        <Image
          src="/images/404.svg"
          alt=""
          aria-hidden
          className="mx-auto mb-8 w-2/3 sm:w-[288px]"
          width={288}
          height={190}
        />

        <h1 className="text-[1.6rem] font-bold tracking-tight text-dark sm:text-[2rem]">
          We can&apos;t find that page
        </h1>

        <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-body">
          The page you were looking for has moved, been deleted, or never
          existed. The collection is still where you left it.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue px-7 text-[14px] font-bold text-white transition-colors hover:bg-blue-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <Link
            href="/shop-with-sidebar"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-3 px-7 text-[14px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
          >
            <Search className="h-4 w-4" />
            Browse frames
          </Link>
        </div>
      </div>
    </SiteContainer>
  </section>
);

export default Error;

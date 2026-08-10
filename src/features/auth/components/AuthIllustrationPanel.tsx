"use client";
import Image from "next/image";
import { siteConfig } from "@/config/site";

const AuthIllustrationPanel = () => {
  return (
    <div className="hidden flex-col gap-6 rounded-l-3xl bg-gradient-to-br from-blue to-blue-light-3 p-6 text-white shadow-lg lg:flex">
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-light-5">
          {siteConfig.name}
        </p>
        <h2 className="text-2xl font-semibold leading-snug">
          See Clearly, Look Your Best
        </h2>
        <p className="text-sm text-white/80">
          Browse frames, lenses and sunglasses, and track your order from
          fitting to delivery.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-white/10 p-4">
          <Image
            src={siteConfig.logoOnDark}
            alt={siteConfig.name}
            width={867}
            height={983}
            className="h-full w-full object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
};

export default AuthIllustrationPanel;

"use client";
import Image from "next/image";
import { siteConfig } from "@/config/site";

const AuthIllustrationPanel = () => {
  return (
    <div className="hidden flex-col gap-6 rounded-l-3xl bg-gradient-to-br from-blue-light-3 via-gray-2 to-gray-1 p-6 text-white shadow-lg lg:flex border-r border-blue/20">
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-blue">
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
        <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-black/30 border border-blue/15 p-4">
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

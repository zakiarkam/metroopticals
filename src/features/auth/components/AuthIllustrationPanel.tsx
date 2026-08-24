"use client";

import Image from "next/image";
import { Eye, ShieldCheck, Truck } from "lucide-react";
import { siteConfig } from "@/config/site";

/**
 * Brand panel beside the sign-in form.
 *
 * A gold gradient with espresso ink — the one place on the auth screens that
 * carries colour, so the form itself can stay plain white and legible.
 */

const POINTS = [
  { icon: Eye, label: "Free eye test with every pair" },
  { icon: Truck, label: "Island-wide delivery in 2 days" },
  { icon: ShieldCheck, label: "12-month warranty on frames" },
];

const AuthIllustrationPanel = () => (
  <div className="relative hidden flex-col justify-between overflow-hidden rounded-l-3xl bg-gradient-to-br from-[#E4CC84] via-[#C09C6C] to-[#9A7645] p-8 lg:flex">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-20"
      style={{
        backgroundImage: "radial-gradient(#0A0A0A 1.5px, transparent 1.5px)",
        backgroundSize: "18px 18px",
      }}
    />

    <div className="relative space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-dark/70">
        {siteConfig.name}
      </p>
      <h2 className="text-[1.75rem] font-bold leading-[1.12] tracking-tight text-dark">
        See clearly,
        <span className="block">look your best.</span>
      </h2>
      <p className="max-w-xs text-[13.5px] leading-relaxed text-dark/80">
        Browse frames, lenses and sunglasses, and track your order from fitting
        to delivery.
      </p>
    </div>

    <div className="relative my-8 flex flex-1 items-center justify-center">
      <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-dark/10 bg-white/70 p-6 backdrop-blur-sm">
        <Image
          src={siteConfig.logo}
          alt={siteConfig.name}
          width={867}
          height={983}
          className="h-full w-full object-contain"
          priority
        />
      </div>
    </div>

    <ul className="relative space-y-3 border-t border-dark/20 pt-6">
      {POINTS.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-3 text-[13px] font-medium text-dark/85">
          <Icon className="h-4 w-4 shrink-0 text-dark/60" />
          {label}
        </li>
      ))}
    </ul>
  </div>
);

export default AuthIllustrationPanel;

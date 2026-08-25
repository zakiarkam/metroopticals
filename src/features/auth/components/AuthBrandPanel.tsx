"use client";

import Image from "next/image";
import { ArrowRight, Eye, ShieldCheck, Truck } from "lucide-react";
import { siteConfig } from "@/config/site";

/**
 * The gold half of the auth card.
 *
 * On large screens this panel slides between the two halves of the card (see
 * `components/index.tsx`) and its copy swaps to invite the visitor to the
 * *other* form — sign-in offers "create an account", sign-up offers "sign in".
 * It is the only surface on the auth screens that carries colour, which keeps
 * the form side plain white and easy to read.
 */

const POINTS = [
  { icon: Eye, label: "Free eye test with every pair" },
  { icon: Truck, label: "Island-wide delivery in 2 days" },
  { icon: ShieldCheck, label: "12-month warranty on frames" },
];

const COPY = {
  login: {
    kicker: "New around here?",
    heading: "Create your account.",
    body: "Save your prescription, track every order and re-order lenses in a couple of taps.",
    cta: "Create account",
  },
  signup: {
    kicker: "One of us already?",
    heading: "Welcome back.",
    body: "Sign in to pick up where you left off — your cart, orders and saved frames are waiting.",
    cta: "Sign in",
  },
} as const;

interface AuthBrandPanelProps {
  /** Which form is currently on screen — the panel invites you to the other. */
  mode: "login" | "signup";
  onSwitch: () => void;
}

const AuthBrandPanel = ({ mode, onSwitch }: AuthBrandPanelProps) => {
  const copy = COPY[mode];

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-[linear-gradient(155deg,#3E2C15_0%,#6E5029_45%,#A9834B_100%)] p-9 xl:p-11">
      {/* Photograph under a gold scrim — texture and depth without losing the
          contrast the white copy needs. */}
      <Image
        src="/images/auth/eyewear-still-life.jpg"
        alt=""
        aria-hidden
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="pointer-events-none object-cover opacity-40"
        priority
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(155deg,rgba(35,24,11,0.94)_0%,rgba(78,56,28,0.9)_42%,rgba(122,92,50,0.82)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(115%_85%_at_12%_0%,rgba(255,255,255,0.18),transparent_58%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-blue-light/30 blur-3xl"
      />

      <div className="relative flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-dark p-2.5 shadow-lg shadow-black/25 ring-1 ring-blue-light/30">
          <Image
            src={siteConfig.logoMark}
            alt={siteConfig.name}
            width={64}
            height={64}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-wide text-white">
            {siteConfig.name}
          </p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">
            {siteConfig.tagline}
          </p>
        </div>
      </div>

      {/* `key` remounts the block on a mode change, which replays the CSS
          entrance — a plain animation that cannot get stuck part-way. */}
      <div
        key={mode}
        className="relative my-10 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-light-2">
          {copy.kicker}
        </p>
        <h2 className="max-w-sm text-[2rem] font-bold leading-[1.1] tracking-tight text-white xl:text-[2.35rem]">
          {copy.heading}
        </h2>
        <p className="max-w-xs text-sm leading-relaxed text-white/75">
          {copy.body}
        </p>
        <button
          type="button"
          onClick={onSwitch}
          className="group mt-2 inline-flex h-11 items-center gap-2 rounded-xl border border-white/50 px-6 text-sm font-semibold text-white transition-all hover:border-white hover:bg-white hover:text-[#4A3117]"
        >
          {copy.cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      <ul className="relative space-y-2.5 border-t border-white/15 pt-6">
        {POINTS.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-3 text-[13px] font-medium text-white/80"
          >
            <Icon className="h-4 w-4 shrink-0 text-blue-light-2" aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AuthBrandPanel;

"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarCheck, Phone } from "lucide-react";
import { siteConfig } from "@/config/site";

/**
 * Home hero.
 *
 * Split layout: dark editorial side (vertical wordmark + eye-test booking
 * prompt) against a gold panel that carries the product. The black frames sit
 * on the gold, which is where they read strongest.
 *
 * Deliberately static — no float, drift, glow or pointer parallax. The only
 * movement is on hover/press, plus a cross-fade when switching frames.
 *
 * To add a frame: drop a background-free PNG into
 * `public/images/hero/frames/` and add an entry to FRAMES.
 */

const FRAMES = [
  {
    id: "wayfarer-black",
    image: "/images/hero/frames/wayfarer-black.png",
    name: "Wayfarer Classic",
  },
  {
    id: "wayfarer-optical",
    image: "/images/hero/frames/wayfarer-optical.png",
    name: "Wayfarer Optical",
  },
  {
    id: "round-tortoise",
    image: "/images/hero/frames/round-tortoise.png",
    name: "Round Heritage",
  },
  {
    id: "round-gold",
    image: "/images/hero/frames/round-gold.png",
    name: "Round Metal",
  },
];

/**
 * Decorative marks over the gold panel, lookbook style.
 *
 * Confined to the upper band of the panel — the lower third carries the frame
 * name and the thumbnail row, and free-floating marks were colliding with them.
 */
const Decor = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[62%] overflow-hidden"
  >
    {/* dot grids */}
    <div
      className="absolute right-6 top-8 h-24 w-36 opacity-30"
      style={{
        backgroundImage: "radial-gradient(#0A0A0A 1.6px, transparent 1.6px)",
        backgroundSize: "16px 16px",
      }}
    />
    <div
      className="absolute bottom-2 left-4 h-20 w-28 opacity-20"
      style={{
        backgroundImage: "radial-gradient(#0A0A0A 1.6px, transparent 1.6px)",
        backgroundSize: "16px 16px",
      }}
    />

    {/* diamond */}
    <span className="absolute right-16 bottom-6 block h-5 w-5 rotate-45 border-2 border-gray-1/40" />
    {/* filled dot */}
    <span className="absolute right-8 top-1/2 block h-3.5 w-3.5 rounded-full bg-gray-1/35" />
    {/* cross */}
    <span className="absolute right-1/3 top-4 text-xl font-bold leading-none text-gray-1/25">
      ✕
    </span>
    {/* arc */}
    <span className="absolute left-8 bottom-10 block h-8 w-8 rounded-full border-2 border-gray-1/35 border-b-transparent border-l-transparent" />

    {/* squiggle */}
    <svg
      className="absolute right-10 top-24 h-8 w-10 opacity-45"
      viewBox="0 0 40 32"
      fill="none"
      stroke="#0A0A0A"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <path d="M2 26 L10 6 M12 26 L20 6 M22 26 L30 6" />
    </svg>
  </div>
);

const Hero3D = () => {
  const [active, setActive] = useState(0);

  return (
    <section className="relative isolate overflow-hidden bg-gray-1">
      {/* flowing contour lines on the dark side */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.10]"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <path
              key={i}
              d={`M-100 ${190 + i * 74} C 320 ${90 + i * 74}, 760 ${
                430 + i * 52
              }, 1560 ${180 + i * 66}`}
              stroke="#C09C6C"
              strokeWidth="1.5"
            />
          ))}
        </svg>
      </div>

      <div className="relative mx-auto w-full max-w-[1560px] px-4 sm:px-6 lg:px-10">
        {/* The gold promo column is deliberately the narrowest of the three —
            the product is the hero, the eye-test panel supports it. */}
        <div className="grid grid-cols-1 items-stretch gap-8 py-10 lg:grid-cols-[auto_minmax(0,1.35fr)_minmax(0,0.72fr)] lg:gap-7 lg:py-0">
          {/* ===== 1. vertical wordmark ===== */}
          <div className="pointer-events-none flex items-center gap-4 lg:h-[660px]">
            <div className="hidden flex-col justify-between self-stretch py-10 lg:flex">
              {[0.9, 0.6, 0.4, 0.25].map((o, i) => (
                <span
                  key={i}
                  className="block h-6 w-6 rounded-[6px] border-2 border-blue"
                  style={{ opacity: o }}
                />
              ))}
            </div>

            <h1
              className="select-none font-bold uppercase leading-[0.82] tracking-[-0.045em] text-dark
                         text-[3.2rem] sm:text-[4.6rem]
                         lg:[writing-mode:vertical-rl] lg:rotate-180 lg:text-[8.2rem] xl:text-[9.6rem]"
            >
              Metro
            </h1>
          </div>

          {/* ===== 2. product, centre, on the dark side ===== */}
          <div className="relative flex flex-col justify-center lg:py-14">
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 h-[20rem] w-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue/[0.14] blur-[90px]"
            />

            <div className="relative flex h-[220px] items-center justify-center sm:h-[300px] lg:h-[360px]">
              {FRAMES.map((f, i) => (
                <Image
                  key={f.id}
                  src={f.image}
                  alt={f.name}
                  width={1400}
                  height={760}
                  priority={i === 0}
                  className={`absolute max-h-full w-auto max-w-full object-contain drop-shadow-[0_32px_55px_rgba(0,0,0,0.8)] transition-opacity duration-500 ${
                    i === active ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
            </div>

            <div className="relative mt-6">
              <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
                {FRAMES[active].name}
              </p>

              <div className="mt-4 flex justify-center gap-2.5">
                {FRAMES.map((f, i) => (
                  <button
                    key={f.id}
                    onClick={() => setActive(i)}
                    aria-label={`Show ${f.name}`}
                    aria-pressed={i === active}
                    className={`grid h-14 w-[70px] place-items-center rounded-xl border p-1.5 transition-colors duration-200 ${
                      i === active
                        ? "border-blue bg-blue/[0.12]"
                        : "border-gray-3 bg-gray-2/60 hover:border-blue/50"
                    }`}
                  >
                    <Image
                      src={f.image}
                      alt=""
                      width={140}
                      height={80}
                      className="max-h-full w-auto max-w-full object-contain"
                    />
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-center">
                <Link
                  href="/shop-with-sidebar"
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-blue transition-colors duration-200 hover:text-blue-light"
                >
                  Browse all frames
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* ===== 3. gold panel — eye-test promotion ===== */}
          <div className="relative -mx-4 sm:-mx-6 lg:mx-0 lg:-mr-10">
            <div className="relative flex h-full min-h-[420px] flex-col justify-center overflow-hidden bg-gradient-to-br from-[#E4CC84] via-[#C09C6C] to-[#9A7645] px-6 py-10 lg:min-h-[660px] lg:px-7">
              <Decor />

              <div className="relative z-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-1/70">
                  Free with every pair
                </p>
                <h2 className="mt-3 text-[1.9rem] font-bold leading-[1.06] tracking-tight text-gray-1 sm:text-[2.3rem] lg:text-[1.85rem] xl:text-[2.1rem]">
                  Save your vision.
                  <span className="block">Book an eye test.</span>
                </h2>

                {/* photo */}
                <div className="relative mt-6 overflow-hidden rounded-[26px] border-4 border-gray-1/15 shadow-[0_24px_50px_rgba(0,0,0,0.35)]">
                  <Image
                    src="/images/hero/eye-test.jpg"
                    alt="Optometrist examining a patient's eyes with a slit lamp at Metro Opticals"
                    width={1100}
                    height={1027}
                    className="h-[210px] w-full object-cover object-center sm:h-[240px] lg:h-[200px] xl:h-[225px]"
                  />
                </div>

                <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-gray-1/85">
                  A 20-minute check with our optometrist — vision test, retina
                  screening and your prescription written on the spot.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-2.5">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 rounded-full bg-gray-1 px-5 py-3 text-[13.5px] font-bold text-dark transition-opacity duration-200 hover:opacity-90"
                  >
                    Book an eye test
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href={siteConfig.contact.phoneHref}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-gray-1/40 px-4 py-[10px] text-[13.5px] font-bold text-gray-1 transition-colors duration-200 hover:border-gray-1"
                  >
                    <Phone className="h-4 w-4" />
                    {siteConfig.contact.phone}
                  </a>
                </div>

                <p className="mt-4 flex items-center gap-2 text-[12px] font-medium text-gray-1/70">
                  <CalendarCheck className="h-4 w-4" />
                  Mon–Sun · 9am – 7pm · Walk-ins welcome
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- bottom rail ---------------- */}
        <div className="flex items-center justify-between border-t border-gray-3 py-4 text-[11px] uppercase tracking-[0.16em] text-dark-4">
          <div className="flex items-center gap-5">
            <a
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-blue"
            >
              IG
            </a>
            <a
              href={siteConfig.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-blue"
            >
              FB
            </a>
            <a
              href={`https://wa.me/${siteConfig.contact.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-blue"
            >
              WA
            </a>
          </div>

          <p className="hidden sm:block normal-case tracking-normal">
            UV protection · Anti-glare · Scratch resistant · 12-month warranty
          </p>

          <Link href="/faq" className="transition-colors hover:text-blue">
            Help
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Hero3D;

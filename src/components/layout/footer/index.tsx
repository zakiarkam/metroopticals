"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Clock,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";

import { useCachedSession } from "@/features/auth/hooks/use-cached-session";
import { siteConfig } from "@/config/site";

/**
 * Site footer.
 *
 * Replaces the generic animated-footer template, which stacked everything in
 * one centred column inside a 40rem-tall box — a lot of empty space for four
 * links. This is a conventional four-column footer with the oversized wordmark
 * kept as a background flourish, since that was the one part worth keeping.
 */

const SHOP_LINKS = [
  { label: "All frames", href: "/shop-with-sidebar" },
  { label: "New arrivals", href: "/shop-with-sidebar" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Cart", href: "/cart" },
];

const HELP_LINKS = [
  { label: "FAQs", href: "/faq" },
  { label: "Contact us", href: "/contact" },
  { label: "Book an eye test", href: "/contact" },
];

const Footer = () => {
  const { status } = useCachedSession();
  const isAuthenticated = status === "authenticated";

  const accountLinks = [
    { label: "My account", href: "/my-account" },
    { label: "My orders", href: "/my-account/orders" },
    ...(isAuthenticated
      ? []
      : [{ label: "Sign in / Register", href: "/log-in" }]),
  ];

  const columns = [
    { title: "Shop", links: SHOP_LINKS },
    { title: "Help", links: HELP_LINKS },
    { title: "Account", links: accountLinks },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-gray-3 bg-gray-2">
      {/* oversized wordmark, bled off the bottom edge */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[-0.18em] select-none bg-gradient-to-b from-dark/[0.07] to-transparent bg-clip-text text-center font-extrabold uppercase leading-none tracking-tighter text-transparent"
        style={{ fontSize: "clamp(4rem, 15vw, 13rem)" }}
      >
        Metro
      </span>

      <div className="relative mx-auto w-full max-w-[1560px] px-4 sm:px-6 lg:px-10">
        {/* ---------------------------- main grid ---------------------------- */}
        <div className="grid gap-10 py-14 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:gap-12 lg:py-16">
          {/* brand + contact */}
          <div>
            <Link href="/" aria-label="Metro Opticals home" className="inline-block">
              <Image
                src={siteConfig.logoOnDark}
                alt={siteConfig.name}
                width={867}
                height={983}
                className="h-14 w-auto"
              />
            </Link>

            <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-body">
              {siteConfig.description}
            </p>

            <ul className="mt-6 space-y-3">
              <li className="flex gap-3 text-[13px] text-body">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
                {siteConfig.contact.address}
              </li>
              <li>
                <a
                  href={siteConfig.contact.phoneHref}
                  className="flex gap-3 text-[13px] text-body transition-colors hover:text-blue"
                >
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="flex gap-3 break-all text-[13px] text-body transition-colors hover:text-blue"
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex gap-3 text-[13px] text-body">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
                Mon–Sun · 9am – 7pm
              </li>
            </ul>

            <div className="mt-7 flex items-center gap-2.5">
              {[
                {
                  href: siteConfig.social.facebook,
                  label: "Facebook",
                  Icon: Facebook,
                },
                {
                  href: siteConfig.social.instagram,
                  label: "Instagram",
                  Icon: Instagram,
                },
                {
                  href: `https://wa.me/${siteConfig.contact.whatsapp}`,
                  label: "WhatsApp",
                  Icon: MessageCircle,
                },
              ].map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${siteConfig.name} on ${label}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-3 text-dark-4 transition-colors hover:border-blue hover:text-blue"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          {/* link columns */}
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue">
                {column.title}
              </h2>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-[13.5px] text-body transition-colors hover:text-blue"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* ----------------------------- bottom ----------------------------- */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-3 py-6 sm:flex-row">
          <p className="text-[12.5px] text-dark-5">
            © {new Date().getFullYear()} {siteConfig.legalName}. All rights
            reserved.
          </p>
          <p className="text-[12px] text-dark-5">
            UV protection · Anti-glare · Scratch resistant · 12-month warranty
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

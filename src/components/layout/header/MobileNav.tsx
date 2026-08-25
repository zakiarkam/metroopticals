"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Headset, Heart, MapPin } from "lucide-react";
import {
  resolveColumns,
  EMPTY_CATALOGUE,
  type NavCatalogue,
  type NavItem,
} from "@/features/site-content/components/site/MegaMenu";
import { getBrandLogoUrl } from "@/lib/storageUtils";

export default function MobileNav({
  items,
  catalogue = EMPTY_CATALOGUE,
  onNavigate,
}: {
  items: NavItem[];
  catalogue?: NavCatalogue;
  onNavigate: () => void;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="max-h-[calc(100vh-var(--site-header-height,140px))] overflow-y-auto px-1 py-3">
      <ul className="flex flex-col">
        {items.map((item, index) => {
          const columns = resolveColumns(item, catalogue);
          const open = openIndex === index;

          if (!columns.length) {
            return (
              <li key={index}>
                <Link
                  href={item.href || "#"}
                  onClick={onNavigate}
                  className={`flex items-center gap-2 rounded-lg px-3 py-3 text-[15px] font-semibold transition-colors hover:bg-gray-8 ${
                    item.accent ? "text-red" : "text-dark"
                  }`}
                >
                  {item.label}
                  {item.badge && (
                    <span className="rounded-full bg-blue-light-4 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-blue-dark">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          }

          return (
            <li key={index} className="border-b border-gray-3 last:border-b-0">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenIndex(open ? null : index)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-[15px] font-semibold transition-colors hover:bg-gray-8 ${
                  item.accent ? "text-red" : "text-dark"
                }`}
              >
                {item.label}
                <ChevronDown
                  className={`h-4 w-4 text-dark-4 transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </button>

              {open && (
                <div className="space-y-4 px-3 pb-4">
                  <Link
                    href={item.href || "#"}
                    onClick={onNavigate}
                    className="inline-block text-[13px] font-bold text-blue underline underline-offset-2"
                  >
                    Shop all {item.label?.toLowerCase()}
                  </Link>

                  {columns.map((column, columnIndex) => (
                    <div key={columnIndex}>
                      {column.title && (
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-dark-5">
                          {column.title}
                        </p>
                      )}

                      {/* Brands read as logos on a phone too  the same tiles
                          the desktop panel draws, two to a row. */}
                      {column.source === "brands" ? (
                        <ul className="grid grid-cols-2 gap-2.5">
                          {(column.links ?? []).map((link, linkIndex) => {
                            const logo = getBrandLogoUrl(link.logo);

                            return (
                              <li key={linkIndex}>
                                <Link
                                  href={link.href || "#"}
                                  onClick={onNavigate}
                                  className="block rounded-xl border border-gray-3 bg-gray-1 p-2.5"
                                >
                                  {logo ? (
                                    <>
                                      <span className="relative flex h-9 items-center justify-center overflow-hidden">
                                        <Image
                                          src={logo}
                                          alt={link.label || ""}
                                          fill
                                          sizes="140px"
                                          unoptimized={logo.endsWith(".svg")}
                                          className="object-contain"
                                        />
                                      </span>
                                      <span className="mt-1.5 block truncate text-center text-[12px] font-semibold text-dark-2">
                                        {link.label}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="flex min-h-[3.25rem] items-center justify-center text-center text-[12px] font-bold uppercase leading-snug tracking-[0.08em] text-dark">
                                      {link.label}
                                    </span>
                                  )}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                          {(column.links ?? []).map((link, linkIndex) => (
                            <li key={linkIndex}>
                              <Link
                                href={link.href || "#"}
                                onClick={onNavigate}
                                className={`block text-[13.5px] transition-colors hover:text-blue ${
                                  link.accent ? "text-red" : "text-body"
                                }`}
                              >
                                {link.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-3 pt-3">
        {[
          { href: "/wishlist", label: "Wishlist", Icon: Heart },
          { href: "/contact", label: "Contact", Icon: Headset },
          { href: "/contact", label: "Store", Icon: MapPin },
        ].map(({ href, label, Icon }) => (
          <Link
            key={label}
            href={href}
            onClick={onNavigate}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-3 py-3 text-[12px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "@/features/home/types/menu";

function ChevronDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Dropdown({
  menuItem,
  stickyMenu,
}: {
  menuItem: Menu;
  stickyMenu?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const isActive =
    menuItem.submenu?.some((s) => s.path === pathname) ||
    (menuItem.path && menuItem.path === pathname);

  return (
    <li
      ref={rootRef}
      className={`group relative ${
        isActive ? "before:w-full" : "before:w-0 group-hover:before:w-full"
      } before:h-[3px] before:bg-blue before:absolute before:left-0 before:-top-2 before:rounded-b-[3px] before:ease-out before:duration-200`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full xl:w-auto hover:text-blue text-sm font-medium text-dark flex items-center justify-between xl:justify-start gap-2 capitalize transition-colors ${
          stickyMenu ? "xl:py-3" : "xl:py-4"
        } ${isActive ? "text-blue" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{menuItem.title}</span>
        <ChevronDownIcon
          className={`text-dark transition-transform ${open ? "rotate-180" : ""} xl:group-hover:rotate-180`}
        />
      </button>

      {/* mobile inline submenu */}
      <ul
        className={`mt-2 flex-col gap-1 pl-3 border-l border-gray-200 ${open ? "flex" : "hidden"} xl:hidden`}
      >
        {menuItem.submenu
          ?.filter((i) => i.path)
          .map((item) => (
            <li key={item.path}>
              <Link
                href={item.path!}
                className={`block rounded-md px-3 py-2 text-sm text-dark hover:bg-gray-1 hover:text-blue ${
                  pathname === item.path ? "bg-gray-1 text-blue" : ""
                }`}
              >
                {item.title}
              </Link>
            </li>
          ))}
      </ul>

      {/* desktop floating submenu */}
      <ul
        className={`hidden xl:flex xl:absolute xl:top-full xl:mt-2 xl:right-0 xl:min-w-[220px]
          xl:max-w-[min(320px,calc(100vw-16px))] xl:flex-col xl:rounded-xl xl:border xl:border-gray-200
          xl:bg-white xl:shadow-xl xl:p-2 xl:opacity-0 xl:invisible xl:translate-y-1
          xl:transition-all xl:duration-150
          ${open ? "xl:opacity-100 xl:visible xl:translate-y-0" : ""}
          xl:group-hover:opacity-100 xl:group-hover:visible xl:group-hover:translate-y-0`}
      >
        {menuItem.submenu
          ?.filter((i) => i.path)
          .map((item) => (
            <li key={item.path}>
              <Link
                href={item.path!}
                className={`flex rounded-lg px-3 py-2 text-sm text-dark hover:bg-gray-50 hover:text-blue ${
                  pathname === item.path ? "bg-gray-50 text-blue" : ""
                }`}
              >
                {item.title}
              </Link>
            </li>
          ))}
      </ul>
    </li>
  );
}

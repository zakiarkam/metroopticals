"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Fade-and-lift a block into view the first time it is scrolled to.
 *
 * Hand-rolled on IntersectionObserver rather than framer-motion: this wraps
 * every storefront section, and pulling an animation library into all of them
 * would cost far more bundle than the effect is worth.
 *
 * Two safeguards keep it from ever hiding content:
 *  - `prefers-reduced-motion` skips straight to the visible state
 *  - the element starts visible if IntersectionObserver is unavailable
 */
export default function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  /** Milliseconds, for staggering siblings. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (!node || reduced || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown && delay ? `${delay}ms` : undefined }}
      className={`transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

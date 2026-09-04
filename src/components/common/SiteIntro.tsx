"use client";

import { useCallback, useEffect, useState } from "react";
import { siteConfig } from "@/config/site";

/**
 * The home page's brand moment: an eye drawn in gold that focuses, blinks
 * once, and lifts away as the wordmark comes into focus.
 *
 * It plays on every load of the home page. Two rules keep it a flourish
 * rather than a toll gate:
 *
 *  - The page renders underneath the whole time. This is an overlay, never a
 *    gate: nothing is deferred, so the hero and the first products are
 *    already painted when the curtain lifts.
 *  - It always leaves. The timer is fixed and dismissal is one click or key
 *    away, so a slow network can never strand a customer on a logo.
 */

/** How long the sequence holds before it starts leaving. */
const HOLD_MS = 2000;
/** The fade itself - must match the CSS transition duration. */
const FADE_MS = 520;
/** Someone who asked for less motion gets the brand mark, not the show. */
const REDUCED_HOLD_MS = 300;

/**
 * Reset by a full page load and kept across client-side navigation, so the
 * intro greets an actual visit to the home page but does not replay every
 * time someone clicks the logo on their way back from a product.
 */
let playedThisLoad = false;

export default function SiteIntro() {
  // Read at mount: false on a fresh load, matching what the server rendered;
  // already true when React is only re-mounting this on a client navigation.
  const [done, setDone] = useState(playedThisLoad);
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback(() => setLeaving(true), []);

  useEffect(() => {
    // Guarded on the state captured at mount, never on the module flag: an
    // effect that re-runs (React re-invokes them in development, and the
    // cleanup below clears the timer) has to be free to set the timer again,
    // or the curtain is raised with nothing left to lower it.
    if (done) return;
    playedThisLoad = true;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const timer = window.setTimeout(
      () => setLeaving(true),
      reduced ? REDUCED_HOLD_MS : HOLD_MS,
    );

    window.addEventListener("keydown", dismiss);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", dismiss);
    };
  }, [done, dismiss]);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setDone(true), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (done) return null;

  return (
    <div
      // Decorative: the real page is already behind this, and a screen
      // reader should be reading that rather than announcing a logo.
      aria-hidden="true"
      onClick={dismiss}
      className={`site-intro${leaving ? " site-intro--leaving" : ""}`}
    >
      <div className="site-intro__inner">
        <svg
          className="site-intro__eye"
          viewBox="0 0 140 90"
          fill="none"
          focusable="false"
        >
          <g className="site-intro__blink">
            {/* pathLength normalises the outline to 1 so the draw-on works
                without measuring the curve. */}
            <path
              className="site-intro__outline"
              pathLength={1}
              d="M 12 45 C 34 16, 106 16, 128 45 C 106 74, 34 74, 12 45 Z"
              stroke="#8F6A37"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <circle
              className="site-intro__iris"
              cx={70}
              cy={45}
              r={17}
              fill="#C09C6C"
              fillOpacity={0.35}
              stroke="#8F6A37"
              strokeWidth={2}
            />
            <circle
              className="site-intro__pupil"
              cx={70}
              cy={45}
              r={7}
              fill="#5E4520"
            />
            <circle
              className="site-intro__glint"
              cx={76.5}
              cy={39}
              r={3.2}
              fill="#FAF8F4"
            />
          </g>
        </svg>

        <p className="site-intro__name">{siteConfig.name}</p>
        <p className="site-intro__tagline">{siteConfig.tagline}</p>

        <span className="site-intro__rule">
          <span className="site-intro__rule-fill" />
        </span>
      </div>
    </div>
  );
}

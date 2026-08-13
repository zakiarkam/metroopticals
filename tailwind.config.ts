import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", "class"],
  theme: {
    fontFamily: {
      "euclid-circular-a": ["Euclid Circular A"],
    },
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "2rem",
        xl: "0",
      },
    },
    /**
     * Metro Opticals — black & gold theme.
     *
     * The token NAMES are inherited from the original light theme and are used
     * across ~250 files, so they are kept and their VALUES remapped instead:
     *   - `blue*`  is the gold accent (buttons, links, highlights)
     *   - `gray-1..3` are dark surfaces (page, card, border) — they get DARKER
     *     as the number grows in the original, so the scale is inverted here
     *   - `dark*` and `body` are light text on those surfaces
     * Gold values are sampled from the logo (dominant tone #C09C6C).
     */
    colors: {
      current: "currentColor",
      transparent: "transparent",
      white: "#FFFFFF",
      /** Default body copy — warm off-white, softened for long reading. */
      body: "#B5AEA2",
      meta: {
        "2": "#CFC7B8",
        "3": "#B5AEA2",
        "4": "#8A8377",
        "5": "#5C564C",
        DEFAULT: "#141414",
      },
      /** Headings and high-emphasis text (light, on dark surfaces). */
      dark: {
        "2": "#EDE7DA",
        "3": "#CFC7B8",
        "4": "#A79F92",
        "5": "#7A7368",
        DEFAULT: "#F5F1E8",
      },
      /** Surfaces, from page background up through raised cards. */
      gray: {
        /*
         * Elevation ladder. Dark UI conveys height with LIGHTNESS, not
         * shadow, so each step is a clearly visible jump rather than the
         * near-identical values a light theme can get away with.
         *   gray-1 page  →  gray-2 card  →  gray-8 raised/hover
         */
        "1": "#0A0A0A", // page background (recessed)
        "2": "#17171A", // card / section surface
        "3": "#2E2E33", // borders, dividers
        "4": "#3D3D43", // stronger borders, disabled fills
        "5": "#8A8377", // muted text
        "6": "#A79F92", // secondary text
        "7": "#CFC7B8", // near-heading text
        "8": "#212126", // raised surface (hover, popovers, table headers)
        DEFAULT: "#17171A",
        /*
         * Components also use Tailwind's default numeric gray scale
         * (bg-gray-200, border-gray-200, text-gray-400, …). Because a custom
         * `colors.gray` replaces the default entirely, those keys are defined
         * here too — INVERTED, so low numbers are dark surfaces and high
         * numbers are light text, matching how they're used in a dark theme.
         */
        "50": "#17171A",
        "100": "#212126",
        "200": "#2E2E33",
        "300": "#3D3D43",
        "400": "#8A8377",
        "500": "#9A9286",
        "600": "#B5AEA2",
        "700": "#CFC7B8",
        "800": "#EDE7DA",
        "900": "#F5F1E8",
      },
      /** Gold accent — sampled from the logo. Replaces the old blue. */
      blue: {
        DEFAULT: "#C09C6C",
        dark: "#A17C4C",
        light: "#D0B183",
        "light-2": "#DCC79C",
        "light-3": "#3A3227",
        "light-4": "#2A2419",
        "light-5": "#1C1811",
        // numeric scale: low = dark gold-tinted fill, high = bright gold
        "50": "#1C1811",
        "100": "#2A2419",
        "200": "#3A3227",
        "300": "#5C4E3A",
        "400": "#A17C4C",
        "500": "#C09C6C",
        "600": "#D0B183",
        "700": "#DCC79C",
        "800": "#E8DAB9",
        "900": "#F3EDDC",
      },
      /**
       * Status colours. The vivid tones stay bright enough to read on black,
       * while the former pale tints (`light-3`..`light-6`) are inverted into
       * dark, desaturated fills so badges don't glare on dark surfaces.
       */
      red: {
        DEFAULT: "#F65454",
        dark: "#FF7A7A",
        light: "#F87171",
        "light-2": "#8C3232",
        "light-3": "#5E2424",
        "light-4": "#401A1A",
        "light-5": "#2E1414",
        "light-6": "#241010",
        // numeric scale: low = dark fill, high = bright text
        "50": "#2E1414",
        "100": "#401A1A",
        "200": "#5E2424",
        "300": "#8C3232",
        "400": "#E06565",
        "500": "#F65454",
        "600": "#FF7A7A",
        "700": "#FF9B9B",
        "800": "#FFBDBD",
        "900": "#FFD9D9",
      },
      green: {
        DEFAULT: "#34C77B",
        dark: "#5BD897",
        light: "#4ADE80",
        "light-2": "#1F6B44",
        "light-3": "#17532F",
        "light-4": "#123D24",
        "light-5": "#0E2E1C",
        "light-6": "#0B2416",
        "50": "#0E2E1C",
        "100": "#123D24",
        "200": "#17532F",
        "300": "#1F6B44",
        "400": "#2FB56F",
        "500": "#34C77B",
        "600": "#4ADE80",
        "700": "#7BE9A6",
        "800": "#A6F0C4",
        "900": "#CFF7DF",
      },
      yellow: {
        DEFAULT: "#E8B450",
        dark: "#F3C765",
        "dark-2": "#D9A63C",
        light: "#F0CC7A",
        "light-1": "#6B5426",
        "light-2": "#4A3A1B",
        "light-4": "#2E2412",
        "50": "#2E2412",
        "100": "#4A3A1B",
        "200": "#6B5426",
        "300": "#8F7133",
        "400": "#D9A63C",
        "500": "#E8B450",
        "600": "#F0CC7A",
        "700": "#F5DA9C",
        "800": "#FAE8BF",
        "900": "#FDF4DF",
      },
      teal: {
        DEFAULT: "#2FB8B2",
        dark: "#4FCEC8",
      },
      orange: {
        DEFAULT: "#F08A4B",
        dark: "#F5A470",
        "50": "#33200F",
        "100": "#4A2E15",
        "200": "#6B4420",
        "300": "#9C6330",
        "400": "#E07C3C",
        "500": "#F08A4B",
        "600": "#F5A470",
        "700": "#F8BE97",
        "800": "#FBD6BD",
        "900": "#FDEBE0",
      },
      purple: {
        "100": "#2A1F3D",
        "300": "#4A3866",
        "600": "#B79BE8",
        "700": "#C9B4EF",
      },
      emerald: {
        "50": "#0E2E1C",
        "100": "#123D24",
        "200": "#17532F",
        "600": "#4ADE80",
        "700": "#7BE9A6",
      },
      slate: {
        "50": "#17171A",
        "100": "#212126",
        "200": "#2E2E33",
        "700": "#CFC7B8",
        "800": "#EDE7DA",
        "900": "#F5F1E8",
      },
      black: "#000000",
    },
    screens: {
      xsm: "375px",
      lsm: "425px",
      "3xl": "2000px",
      ...defaultTheme.screens,
    },
    extend: {
      fontSize: {
        "2xs": ["10px", "17px"],
        "heading-1": ["60px", "72px"],
        "heading-2": ["48px", "64px"],
        "heading-3": ["40px", "48px"],
        "heading-4": ["30px", "38px"],
        "heading-5": ["28px", "40px"],
        "heading-6": ["24px", "30px"],
        "custom-xl": ["20px", "24px"],
        "custom-lg": ["18px", "24px"],
        "custom-sm": ["14px", "22px"],
        "custom-xs": ["12px", "20px"],
        "custom-2xl": ["24px", "34px"],
        "custom-4xl": ["36px", "48px"],
        "custom-1": ["22px", "30px"],
        "custom-2": ["32px", "38px"],
        "custom-3": ["35px", "45px"],
      },
      spacing: {
        "11": "2.75rem",
        "13": "3.25rem",
        "14": "3.5rem",
        "15": "3.75rem",
        "16": "4rem",
        "17": "4.25rem",
        "18": "4.5rem",
        "19": "4.75rem",
        "21": "5.25rem",
        "22": "5.5rem",
        "25": "6.25rem",
        "26": "6.5rem",
        "27": "6.75rem",
        "29": "7.25rem",
        "30": "7.5rem",
        "31": "7.75rem",
        "33": "8.25rem",
        "34": "8.5rem",
        "35": "8.75rem",
        "37": "9.25rem",
        "39": "9.75rem",
        "40": "10rem",
        "45": "11.25rem",
        "46": "11.5rem",
        "49": "12.25rem",
        "50": "12.5rem",
        "51": "12.75rem",
        "52": "13rem",
        "54": "13.5rem",
        "55": "13.75rem",
        "59": "14.75rem",
        "60": "15rem",
        "65": "16.25rem",
        "67": "16.75rem",
        "70": "17.5rem",
        "75": "18.75rem",
        "90": "22.5rem",
        "94": "23.5rem",
        "100": "25rem",
        "110": "27.5rem",
        "115": "28.75rem",
        "125": "31.25rem",
        "150": "37.5rem",
        "180": "45rem",
        "203": "50.75rem",
        "230": "57.5rem",
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "6.5": "1.625rem",
        "7.5": "1.875rem",
        "8.5": "2.125rem",
        "9.5": "2.375rem",
        "10.5": "2.625rem",
        "11.5": "2.875rem",
        "12.5": "3.125rem",
        "13.5": "3.375rem",
        "14.5": "3.625rem",
        "15.5": "3.875rem",
        "16.5": "4.125rem",
        "17.5": "4.375rem",
        "18.5": "4.625rem",
        "19.5": "4.875rem",
        "21.5": "5.375rem",
        "22.5": "5.625rem",
        "24.5": "6.125rem",
        "25.5": "6.375rem",
        "27.5": "6.875rem",
        "29.5": "7.375rem",
        "31.5": "7.875rem",
        "32.5": "8.125rem",
        "34.5": "8.625rem",
        "36.5": "9.125rem",
        "37.5": "9.375rem",
        "39.5": "9.875rem",
        "42.5": "10.625rem",
        "47.5": "11.875rem",
        "51.5": "12.875rem",
        "52.5": "13.125rem",
        "54.5": "13.625rem",
        "55.5": "13.875rem",
        "57.5": "14.375rem",
        "62.5": "15.625rem",
        "67.5": "16.875rem",
        "72.5": "18.125rem",
        "92.5": "23.125rem",
        "122.5": "30.625rem",
        "127.5": "31.875rem",
        "132.5": "33.125rem",
        "142.5": "35.625rem",
        "166.5": "41.625rem",
        "171.5": "42.875rem",
        "187.5": "46.875rem",
        "192.5": "48.125rem",
      },
      maxWidth: {
        "30": "7.5rem",
        "40": "10rem",
        "50": "12.5rem",
      },
      zIndex: {
        "1": "1",
        "99": "99",
        "999": "999",
        "9999": "9999",
        "99999": "99999",
        "999999": "999999",
      },
      /*
       * Dark-theme elevation.
       *
       * On a light theme, cards separate from the page with a grey drop
       * shadow. On black that is invisible — so each level pairs a real
       * shadow (for depth below) with a 1px top highlight (`inset 0 1px 0`)
       * that catches "light" on the upper edge, plus a hairline ring. This
       * is what actually reads as a raised surface on dark UI.
       */
      boxShadow: {
        // level 1 — subtle lift (list rows, inputs)
        "1": "0 1px 2px 0 rgba(0,0,0,0.60), inset 0 1px 0 0 rgba(255,255,255,0.04)",
        // level 2 — standard card
        "2": "0 4px 16px -2px rgba(0,0,0,0.70), 0 2px 6px -2px rgba(0,0,0,0.50), inset 0 1px 0 0 rgba(255,255,255,0.05)",
        // level 3 — raised panel / popover
        "3": "0 12px 32px -6px rgba(0,0,0,0.80), 0 4px 10px -3px rgba(0,0,0,0.60), inset 0 1px 0 0 rgba(255,255,255,0.06)",
        // level 4 — modals and dialogs
        "4": "0 24px 60px -12px rgba(0,0,0,0.90), 0 8px 20px -6px rgba(0,0,0,0.70), inset 0 1px 0 0 rgba(255,255,255,0.07)",
        // gold-tinted glow for hover / focus emphasis
        gold: "0 8px 28px -6px rgba(192,156,108,0.30), 0 0 0 1px rgba(192,156,108,0.30)",
        "gold-sm": "0 0 0 1px rgba(192,156,108,0.35)",
        testimonial:
          "0 4px 16px -2px rgba(0,0,0,0.70), inset 0 1px 0 0 rgba(255,255,255,0.05)",
        breadcrumb: "0 1px 0 0 #262626, 0 -1px 0 0 #262626",
        range:
          "0 1px 3px 0 rgba(0,0,0,0.70), inset 0 1px 0 0 rgba(255,255,255,0.10)",
        filter: "0 1px 0 0 #262626",
        list: "1px 0 0 0 #262626",
        input: "inset 0 0 0 2px #C09C6C",

        /*
         * Override Tailwind's DEFAULT shadow scale. The stock values are tuned
         * for light backgrounds (low-opacity black) and are effectively
         * invisible on #0A0A0A — the app uses shadow-lg/md/xl in ~170 places,
         * so redefining them here fixes every one of those at once.
         */
        sm: "0 1px 2px 0 rgba(0,0,0,0.60), inset 0 1px 0 0 rgba(255,255,255,0.03)",
        DEFAULT:
          "0 2px 6px -1px rgba(0,0,0,0.65), inset 0 1px 0 0 rgba(255,255,255,0.04)",
        md: "0 4px 12px -2px rgba(0,0,0,0.70), inset 0 1px 0 0 rgba(255,255,255,0.05)",
        lg: "0 10px 24px -4px rgba(0,0,0,0.75), 0 3px 8px -3px rgba(0,0,0,0.55), inset 0 1px 0 0 rgba(255,255,255,0.05)",
        xl: "0 18px 40px -8px rgba(0,0,0,0.82), 0 6px 14px -4px rgba(0,0,0,0.62), inset 0 1px 0 0 rgba(255,255,255,0.06)",
        "2xl":
          "0 28px 64px -12px rgba(0,0,0,0.90), 0 10px 22px -6px rgba(0,0,0,0.70), inset 0 1px 0 0 rgba(255,255,255,0.07)",
        inner: "inset 0 2px 4px 0 rgba(0,0,0,0.55)",
        none: "none",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s infinite",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;

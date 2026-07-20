import type { Config } from "tailwindcss";

/**
 * Shared Tailwind preset carrying the Noviq design-system tokens.
 * Consumed by apps/frontend and packages/ui so colours never drift.
 *
 * Colours are exposed as CSS variables (defined in the frontend globals.css)
 * so components can be themed without re-compiling Tailwind. Semantic tag
 * colours: green = live/active/success, orange = upcoming/pending,
 * purple = tournament/category, gray = link/neutral.
 */
const preset = {
  content: [],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)", // page background  #F0F4F8
        card: "var(--card)", //     card background  #FFFFFF
        sidebar: {
          DEFAULT: "var(--sidebar)", //   #102A30
          foreground: "var(--sidebar-foreground)",
          muted: "var(--sidebar-muted)",
          active: "var(--sidebar-active)",
        },
        primary: {
          DEFAULT: "var(--primary)", // #102A30
          foreground: "var(--primary-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)", // light blue
          foreground: "var(--accent-foreground)",
        },
        border: "var(--border)",
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        foreground: "var(--foreground)",
        // Semantic status tokens
        status: {
          live: "var(--status-live)",
          "live-bg": "var(--status-live-bg)",
          upcoming: "var(--status-upcoming)",
          "upcoming-bg": "var(--status-upcoming-bg)",
          tournament: "var(--status-tournament)",
          "tournament-bg": "var(--status-tournament-bg)",
          neutral: "var(--status-neutral)",
          "neutral-bg": "var(--status-neutral-bg)",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Partial<Config>;

export default preset;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg-main)",
        sidebar: "var(--sidebar-bg)",
        card: "var(--card-bg)",
        cardBorder: "var(--card-border)",
        itemBorder: "var(--item-border)",
        ink: "var(--text-main)",
        muted: "var(--text-muted)",
        subtle: "var(--text-subtle)",
        nav: "var(--text-nav)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          soft: "var(--primary-soft)",
          border: "var(--primary-border)",
        },
        emerald: {
          DEFAULT: "var(--emerald-primary)",
          glow: "var(--emerald-glow)",
        },
        gold: {
          DEFAULT: "var(--gold-accent)",
          light: "var(--gold-light)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          soft: "var(--danger-soft)",
        },
        warning: "var(--warning)",
        gridLine: "var(--grid-line)",
        btnSec: "var(--btn-sec-bg)",
        input: "var(--input-bg)",
        toggle: "var(--toggle-bg)",
        hover: "var(--hover-bg)",
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "18px" },
      boxShadow: {
        card: "var(--shadow-card)",
        float: "var(--shadow-float)",
        luxury: "0 10px 24px rgba(21,101,255,.28)",
      },
      backgroundImage: { hero: "var(--hero-bg)", body: "var(--body-gradient)" },
    },
  },
  plugins: [],
};

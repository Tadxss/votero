// Plain Tailwind (no `nativewind` preset here): apps/web has no shared React Native Web
// components yet (docs/ARCHITECTURE.md defers packages/ui), so pulling in NativeWind's runtime
// would add an unused react-native peer dependency for no benefit. Add the preset here once
// packages/ui ships shared RN-Web components that need it.
/** @type {import('tailwindcss').Config} */
module.exports = {
  // A manual toggle (see ThemeToggle.tsx) sets `data-theme` on <html>, bootstrapped from system
  // preference on first visit (see the inline script in layout.tsx) — `dark:` utilities key off
  // that attribute rather than `prefers-color-scheme` directly, so an explicit user choice can
  // override the OS setting.
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EEF2FA",
          100: "#D7E1F4",
          300: "#7DA2D6",
          500: "#2F5F9E",
          600: "#234A7D",
          700: "#17325A",
          900: "#0C1C33",
        },
        accent: {
          400: "#4FD1C5",
          500: "#16A394",
          600: "#0E7C6E",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.85)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.92) translateY(4px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(-2deg)" },
          "50%": { transform: "translateY(-8px) rotate(2deg)" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
        "pop-in": "pop-in 0.25s ease-out",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

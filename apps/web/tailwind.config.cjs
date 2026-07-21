// Plain Tailwind (no `nativewind` preset here): apps/web has no shared React Native Web
// components yet (docs/ARCHITECTURE.md defers packages/ui), so pulling in NativeWind's runtime
// would add an unused react-native peer dependency for no benefit. Add the preset here once
// packages/ui ships shared RN-Web components that need it.
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media",
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FFF1F3",
          100: "#FFE1E6",
          300: "#FF93A8",
          500: "#FF4D6D",
          600: "#F5335A",
          700: "#D41F44",
          900: "#7A0E27",
        },
        accent: {
          400: "#FFC93C",
          500: "#FFB627",
          600: "#F59E0B",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-baloo)", "ui-sans-serif", "system-ui", "sans-serif"],
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

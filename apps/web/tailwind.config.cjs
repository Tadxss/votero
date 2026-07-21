// Plain Tailwind (no `nativewind` preset here): apps/web has no shared React Native Web
// components yet (docs/ARCHITECTURE.md defers packages/ui), so pulling in NativeWind's runtime
// would add an unused react-native peer dependency for no benefit. Add the preset here once
// packages/ui ships shared RN-Web components that need it.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

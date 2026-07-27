// Deliberately not part of ThemeToggle.tsx (a "use client" module): a Server Component can't
// reliably pull a plain constant across that boundary (Next treats every export of a "use client"
// module as a client reference, not the literal value), and layout.tsx needs the real string to
// inline into its pre-hydration bootstrap script.
export const THEME_STORAGE_KEY = "votero:theme";

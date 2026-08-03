"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { THEME_STORAGE_KEY } from "./theme";

type Theme = "light" | "dark";

export function ThemeToggle() {
  // Starts null (not the light/dark bootstrapped by the inline script in layout.tsx) so the very
  // first client render matches the server's theme-less markup — avoids a hydration mismatch —
  // then syncs to whatever the bootstrap script actually set, right after mount.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={theme === null}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-full p-2 text-[var(--foreground-muted)] transition-colors hover:bg-neutral-100 hover:text-brand-600 disabled:opacity-0 dark:hover:bg-neutral-800 dark:hover:text-brand-300"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

import type { CSSProperties } from "react";

// rpc_update_lobby_branding already guarantees the stored color is contrast-safe as a resting
// state (supabase/migrations/20260801090600_lobby_branding.sql) — this just derives a visibly
// darker shade for :hover, the same "scale toward black" idea applied client-side.
function darkenHex(hex: string, factor: number): string {
  const scale = (start: number) =>
    Math.round(parseInt(hex.slice(start, start + 2), 16) * factor)
      .toString(16)
      .padStart(2, "0");
  return `#${scale(1)}${scale(3)}${scale(5)}`;
}

// Sets --lobby-accent/--lobby-accent-hover, consumed by Button's primary variant and RadioCard's
// selected state (both fall back to today's default brand color when these are unset) — returning
// undefined for an unbranded lobby means the vote/present pages render pixel-identical to before.
export function lobbyBrandingStyle(brandColor: string | null | undefined): CSSProperties | undefined {
  if (!brandColor) return undefined;
  return {
    "--lobby-accent": brandColor,
    "--lobby-accent-hover": darkenHex(brandColor, 0.85),
  } as CSSProperties;
}

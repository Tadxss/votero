// Canvas 2D contexts (downloadResults.ts, downloadPoster.ts) can't read Tailwind classes or CSS
// custom properties, so these are hand-copied equivalents of a few of this app's design tokens —
// duplicated across those two files until now, which is exactly how a token can drift out of sync
// after a future globals.css change touches one copy and not the other. Kept in one place so
// there's only one spot to update.
export const CANVAS_BACKGROUND = "#f7f9fc"; // brand near-white — see docs/ARCHITECTURE.md Build Order step 61; deliberately not --background (currently #fafafa), which is free to evolve independently for the live UI
export const CANVAS_FOREGROUND = "#1a1d23"; // matches --foreground
export const CANVAS_FOREGROUND_MUTED = "#5b6472"; // matches --foreground-muted
export const CANVAS_CAPTION = "#8b93a1"; // export-only tertiary/caption tone, no live CSS equivalent

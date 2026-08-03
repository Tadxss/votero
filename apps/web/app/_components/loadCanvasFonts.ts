// <canvas> text rendering doesn't pick up next/font's CSS variables (its generated family name is
// hashed and only guaranteed available once actually used elsewhere in the DOM) — so the
// poster/PDF canvas exports load Sora directly via FontFace, from static files pinned in
// public/fonts/ rather than fetched from Google Fonts at runtime (opengraph-image.tsx documents a
// prior deploy environment where that runtime fetch failed outright).
let loaded: Promise<void> | undefined;

export function ensureCanvasFontsLoaded(): Promise<void> {
  if (loaded) return loaded;
  loaded = (async () => {
    const [bold, semibold] = await Promise.all([
      new FontFace("Sora Canvas", "url(/fonts/Sora-Bold.woff2)", { weight: "700" }).load(),
      new FontFace("Sora Canvas", "url(/fonts/Sora-SemiBold.woff2)", { weight: "600" }).load(),
    ]);
    document.fonts.add(bold);
    document.fonts.add(semibold);
    await document.fonts.ready;
  })();
  return loaded;
}

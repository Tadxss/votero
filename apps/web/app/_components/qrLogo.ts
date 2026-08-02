// A simple monogram (no dedicated Votero brand-mark asset exists in the repo) — white rounded
// square, brand-700 "V", inlined as a data: URI so no new static asset is needed and it works
// identically wherever qrcode.react's `imageSettings.src` is read (SVG `<image>` or an offscreen
// canvas draw).
const DEFAULT_QR_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="40" fill="#ffffff"/>
  <text x="100" y="148" font-family="system-ui, sans-serif" font-weight="800" font-size="140" fill="#D41F44" text-anchor="middle">V</text>
</svg>`;

export const DEFAULT_QR_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(DEFAULT_QR_LOGO_SVG)}`;

// Centered logo overlay for a QR code — qrcode.react's own `imageSettings`, not a separately
// composited image, so this works identically for both QRCodeSVG (the live manage/present/poster
// preview pages) and QRCodeCanvas (the poster's offscreen render, later read back via
// `canvas.toDataURL()`). ~22% of the QR's size stays safely inside the ~30% data loss a level="H"
// QR can recover from, and `excavate` cuts a real hole for it rather than just overlaying on top
// of (and potentially obscuring) dark modules.
export function qrImageSettings(brandLogoUrl: string | null | undefined, qrSize: number) {
  const logoSize = Math.round(qrSize * 0.22);
  return {
    src: brandLogoUrl || DEFAULT_QR_LOGO,
    height: logoSize,
    width: logoSize,
    excavate: true,
    // Needed so an offscreen QRCodeCanvas reading a remote brandLogoUrl doesn't taint the canvas
    // once toDataURL() is called on it — Supabase's public-bucket storage already sends permissive
    // CORS headers (same reasoning as loadImage.ts), same as the <img> tags already loading it.
    crossOrigin: "anonymous" as const,
  };
}

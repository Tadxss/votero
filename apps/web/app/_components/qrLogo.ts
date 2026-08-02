// The app's own mark (same shapes as apps/web/public/logo.svg / app/icon.svg / Logo.tsx) —
// inlined as a data: URI so it works identically wherever qrcode.react's `imageSettings.src` is
// read (SVG `<image>` or an offscreen canvas draw), with no extra network request. The excavated
// hole shows the QR's own white background around it, so no backdrop rect is needed here.
const DEFAULT_QR_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="10" y="10" width="80" height="80" rx="24" fill="none" stroke="#D41F44" stroke-width="9"/>
  <rect x="29" y="29" width="42" height="42" rx="13" fill="#D41F44"/>
  <path d="M38 51 L46.5 60 L64 40" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="83" cy="17" r="7.5" fill="#FFB627"/>
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

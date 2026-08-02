// The app's mark: one of a QR code's own finder squares (the ring-in-square pattern every phone
// camera reads as "scan here") with the inner square standing in for a checkmark — reads as
// "vote by scanning" without spelling it out. Same shapes as apps/web/public/logo.svg /
// app/icon.svg / the QR-embedded default logo in qrLogo.ts — kept as one inline component here
// since this is the only place it's composed with surrounding text (the header lockup).
export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-hidden="true">
      <rect x="10" y="10" width="80" height="80" rx="24" fill="none" stroke="#D41F44" strokeWidth="9" />
      <rect x="29" y="29" width="42" height="42" rx="13" fill="#D41F44" />
      <path
        d="M38 51 L46.5 60 L64 40"
        fill="none"
        stroke="#FFF9F6"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="83" cy="17" r="7.5" fill="#FFB627" />
    </svg>
  );
}

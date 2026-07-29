import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { Baloo_2 } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "./_components/Header";
import { Footer } from "./_components/Footer";
import { THEME_STORAGE_KEY } from "./_components/theme";

// Runs before hydration (Next's `beforeInteractive` guarantees this) so the correct theme is set
// before first paint — otherwise a dark-mode visitor would see a flash of the light theme while
// React boots. Kept as a plain string template (not a shared util) since it must be inlined as
// literal script text, not imported/bundled JS.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});
const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-baloo",
});

export const metadata: Metadata = {
  title: "Votero",
  description: "QR-code group voting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the bootstrap script below sets `data-theme` on this element
    // before React hydrates, which would otherwise log a (harmless, but noisy) attribute mismatch
    // warning every single load — same fix `next-themes` documents for the identical situation.
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${baloo.variable} font-sans`}>
        <Providers>
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

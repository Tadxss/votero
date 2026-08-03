// One-off generator for the PNG raster sizes Next.js/PWA manifests require but SVG can't cover
// (apple-touch-icon, manifest icons) — no rasterizer dependency in the repo, so this renders the
// same logo.svg markup in a headless page and screenshots it at each target size. Run manually
// with `node scripts/gen-icon-pngs.mjs` whenever the mark changes; not part of the build.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(path.join(__dirname, "../public/logo.svg"), "utf-8");

const targets = [
  { file: "../app/apple-icon.png", size: 180, background: "#F7F9FC" },
  { file: "../public/icon-192.png", size: 192, background: "#F7F9FC" },
  { file: "../public/icon-512.png", size: 512, background: "#F7F9FC" },
];

const browser = await chromium.launch();
for (const { file, size, background } of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`
    <style>
      html, body { margin: 0; padding: 0; background: ${background}; }
      svg { display: block; width: ${size}px; height: ${size}px; }
    </style>
    ${svg}
  `);
  await page.screenshot({ path: path.join(__dirname, file) });
  await page.close();
  console.log(`wrote ${file} (${size}x${size})`);
}
await browser.close();

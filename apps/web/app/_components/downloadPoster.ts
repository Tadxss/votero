import type { Lobby } from "@repo/types";
import { loadImage } from "./loadImage";

export type PosterPreset = "a4" | "tableTent" | "slide";

function slugifyForFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return slug || "lobby";
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Only A4 Flyer and Table Tent are meant to be printed on real paper — Slide is for an on-screen
// display (a conference room's own projector/monitor), so it's PNG-only, no physical page size.
const PRINT_DIMENSIONS_MM: Record<"a4" | "tableTent", { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  tableTent: { width: 148, height: 210 }, // one A4 sheet folded in half, landscape crease
};

const PIXELS_PER_MM = 300 / 25.4; // 300dpi print quality

// Draws the shared "logo, title, QR, code, footer" layout centered within a box of the given
// pixel size — reused as-is for the A4 Flyer, and drawn twice (once rotated 180°) for the Table
// Tent so it reads right-side-up from both sides once printed and folded.
function drawPosterContent(
  ctx: CanvasRenderingContext2D,
  lobby: Lobby,
  qrImage: HTMLImageElement,
  logoImage: HTMLImageElement | undefined,
  accentColor: string,
  width: number,
  height: number,
) {
  ctx.save();
  ctx.fillStyle = "#fff9f6";
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  let y = height * 0.08;

  if (logoImage) {
    const logoSize = width * 0.14;
    ctx.drawImage(logoImage, centerX - logoSize / 2, y, logoSize, logoSize);
    y += logoSize + height * 0.03;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#22132b"; // matches --foreground
  ctx.font = `bold ${Math.round(width * 0.08)}px system-ui, sans-serif`;
  y += width * 0.07;
  ctx.fillText(lobby.title, centerX, y, width * 0.85);

  const qrSize = width * 0.55;
  y += height * 0.06;
  ctx.drawImage(qrImage, centerX - qrSize / 2, y, qrSize, qrSize);
  y += qrSize + height * 0.05;

  ctx.fillStyle = accentColor;
  ctx.font = `bold ${Math.round(width * 0.09)}px system-ui, sans-serif`;
  ctx.fillText(lobby.code, centerX, y);
  y += height * 0.05;

  ctx.fillStyle = "#6b5b73"; // matches --foreground-muted
  ctx.font = `${Math.round(width * 0.035)}px system-ui, sans-serif`;
  ctx.fillText("Scan to vote", centerX, y);

  ctx.restore();
}

// Slide preset is landscape and side-by-side (QR right, text left) rather than the stacked
// portrait layout above — meant to sit on a projector/monitor next to a speaker, not be printed.
function drawSlideContent(
  ctx: CanvasRenderingContext2D,
  lobby: Lobby,
  qrImage: HTMLImageElement,
  logoImage: HTMLImageElement | undefined,
  accentColor: string,
  width: number,
  height: number,
) {
  ctx.fillStyle = "#fff9f6";
  ctx.fillRect(0, 0, width, height);

  const margin = width * 0.06;
  const qrSize = height * 0.7;
  const qrX = width - qrSize - margin;
  const qrY = (height - qrSize) / 2;
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  const textX = margin;
  const textMaxWidth = qrX - textX - margin;
  let y = height * 0.38;

  if (logoImage) {
    const logoSize = height * 0.16;
    ctx.drawImage(logoImage, textX, y - logoSize - height * 0.04, logoSize, logoSize);
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#22132b";
  ctx.font = `bold ${Math.round(height * 0.09)}px system-ui, sans-serif`;
  ctx.fillText(lobby.title, textX, y, textMaxWidth);
  y += height * 0.14;

  ctx.fillStyle = accentColor;
  ctx.font = `bold ${Math.round(height * 0.12)}px system-ui, sans-serif`;
  ctx.fillText(lobby.code, textX, y);
  y += height * 0.09;

  ctx.fillStyle = "#6b5b73";
  ctx.font = `${Math.round(height * 0.045)}px system-ui, sans-serif`;
  ctx.fillText("Scan to vote", textX, y);
}

async function renderPosterCanvas(
  lobby: Lobby,
  qrDataUrl: string,
  preset: PosterPreset,
): Promise<HTMLCanvasElement> {
  const qrImage = await loadImage(qrDataUrl);
  let logoImage: HTMLImageElement | undefined;
  if (lobby.brandLogoUrl) {
    try {
      logoImage = await loadImage(lobby.brandLogoUrl);
    } catch {
      // Proceed unbranded rather than blocking the whole poster over a logo that failed to load.
    }
  }
  const accentColor = lobby.brandColor ?? "#D41F44"; // brand-700, the app's own default accent

  const canvas = document.createElement("canvas");

  if (preset === "slide") {
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d")!;
    drawSlideContent(ctx, lobby, qrImage, logoImage, accentColor, canvas.width, canvas.height);
    return canvas;
  }

  const { width: widthMm, height: heightMm } = PRINT_DIMENSIONS_MM[preset];
  const width = Math.round(widthMm * PIXELS_PER_MM);
  const halfHeight = Math.round(heightMm * PIXELS_PER_MM);

  if (preset === "a4") {
    canvas.width = width;
    canvas.height = halfHeight;
    const ctx = canvas.getContext("2d")!;
    drawPosterContent(ctx, lobby, qrImage, logoImage, accentColor, width, halfHeight);
    return canvas;
  }

  // Table tent: the same content drawn twice into a canvas twice as tall as one printed card —
  // the bottom half right-side-up, the top half rotated 180° — so folding the sheet in half
  // (landscape crease) produces a two-sided tent that reads correctly from either side.
  canvas.width = width;
  canvas.height = halfHeight * 2;
  const ctx = canvas.getContext("2d")!;

  ctx.save();
  ctx.translate(0, halfHeight);
  drawPosterContent(ctx, lobby, qrImage, logoImage, accentColor, width, halfHeight);
  ctx.restore();

  ctx.save();
  ctx.translate(width, halfHeight);
  ctx.rotate(Math.PI);
  drawPosterContent(ctx, lobby, qrImage, logoImage, accentColor, width, halfHeight);
  ctx.restore();

  return canvas;
}

export async function downloadPosterPng(lobby: Lobby, qrDataUrl: string, preset: PosterPreset) {
  const canvas = await renderPosterCanvas(lobby, qrDataUrl, preset);
  canvas.toBlob((blob) => {
    if (!blob) return;
    triggerDownload(blob, `votero-${slugifyForFilename(lobby.title)}-${lobby.code}-${preset}.png`);
  }, "image/png");
}

export async function downloadPosterPdf(
  lobby: Lobby,
  qrDataUrl: string,
  preset: "a4" | "tableTent",
) {
  const canvas = await renderPosterCanvas(lobby, qrDataUrl, preset);
  const { width: widthMm, height: heightMm } = PRINT_DIMENSIONS_MM[preset];
  const pageHeightMm = preset === "tableTent" ? heightMm * 2 : heightMm;

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: widthMm > pageHeightMm ? "landscape" : "portrait",
    unit: "mm",
    format: [widthMm, pageHeightMm],
  });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, widthMm, pageHeightMm);
  pdf.save(`votero-${slugifyForFilename(lobby.title)}-${lobby.code}-${preset}.pdf`);
}

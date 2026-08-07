import type { Lobby } from "@repo/types";
import { loadImage } from "./loadImage";
import { ensureCanvasFontsLoaded } from "./loadCanvasFonts";
import { CANVAS_BACKGROUND, CANVAS_CAPTION, CANVAS_FOREGROUND, CANVAS_FOREGROUND_MUTED } from "./canvasColors";

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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, height / 2, width / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// A soft-shadowed white card behind the QR — same "QR sits on a raised white card" language the
// manage/present pages already use (rounded-3xl bg-white shadow-2xl), just drawn on canvas.
function drawQrCard(
  ctx: CanvasRenderingContext2D,
  qrImage: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  padding: number,
) {
  ctx.save();
  ctx.shadowColor = "rgba(20, 23, 28, 0.18)";
  ctx.shadowBlur = padding * 0.9;
  ctx.shadowOffsetY = padding * 0.25;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x - padding, y - padding, size + padding * 2, size + padding * 2, padding * 0.9);
  ctx.fill();
  ctx.restore();
  ctx.drawImage(qrImage, x, y, size, size);
}

// The lobby code as a soft accent-tinted pill, matching the app's own `bg-brand-50 text-brand-700`
// code-badge styling on the manage/present pages, rather than plain bold text. `x` is the pill's
// center for "center" alignment (the portrait presets) or its left edge for "left" (the slide
// preset, which is left-aligned throughout).
function drawCodePill(
  ctx: CanvasRenderingContext2D,
  code: string,
  accentColor: string,
  x: number,
  y: number,
  fontSize: number,
  align: "center" | "left" = "center",
) {
  ctx.font = `bold ${Math.round(fontSize)}px "Sora Canvas", system-ui, sans-serif`;
  const textWidth = ctx.measureText(code).width;
  const padX = fontSize * 0.9;
  const padY = fontSize * 0.5;
  const pillWidth = textWidth + padX * 2;
  const pillHeight = fontSize + padY * 2;
  const pillLeft = align === "center" ? x - pillWidth / 2 : x;
  const textCenterX = pillLeft + pillWidth / 2;

  ctx.fillStyle = hexToRgba(accentColor, 0.12);
  roundRect(ctx, pillLeft, y, pillWidth, pillHeight, pillHeight / 2);
  ctx.fill();

  const prevAlign = ctx.textAlign;
  ctx.fillStyle = accentColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(code, textCenterX, y + pillHeight / 2);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = prevAlign;

  return pillHeight;
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  width: number,
  fontSize: number,
) {
  ctx.strokeStyle = "rgba(91, 100, 114, 0.2)"; // CANVAS_FOREGROUND_MUTED at low alpha
  ctx.lineWidth = Math.max(1, fontSize * 0.06);
  ctx.beginPath();
  ctx.moveTo(centerX - width / 2, y);
  ctx.lineTo(centerX + width / 2, y);
  ctx.stroke();

  ctx.fillStyle = CANVAS_CAPTION;
  ctx.font = `600 ${Math.round(fontSize)}px "Sora Canvas", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Powered by Votero", centerX, y + fontSize * 1.8);
}

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
  ctx.fillStyle = CANVAS_BACKGROUND;
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  let y = height * 0.1;

  if (logoImage) {
    const logoSize = width * 0.13;
    ctx.drawImage(logoImage, centerX - logoSize / 2, y, logoSize, logoSize);
    y += logoSize + height * 0.035;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = CANVAS_FOREGROUND;
  const titleSize = Math.round(width * 0.075);
  ctx.font = `bold ${titleSize}px "Sora Canvas", system-ui, sans-serif`;
  y += titleSize * 0.9;
  ctx.fillText(lobby.title, centerX, y, width * 0.82);

  // Thin accent underline beneath the title — the same "small brand touch, not a loud banner"
  // idea as the PDF report's header rule.
  y += height * 0.025;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = Math.max(2, width * 0.006);
  ctx.beginPath();
  ctx.moveTo(centerX - width * 0.08, y);
  ctx.lineTo(centerX + width * 0.08, y);
  ctx.stroke();

  const qrSize = width * 0.48;
  const qrPadding = width * 0.035;
  y += height * 0.06 + qrPadding;
  drawQrCard(ctx, qrImage, centerX - qrSize / 2, y, qrSize, qrPadding);
  y += qrSize + qrPadding + height * 0.055;

  const codeFontSize = Math.round(width * 0.065);
  const pillHeight = drawCodePill(ctx, lobby.code, accentColor, centerX, y, codeFontSize);
  y += pillHeight + height * 0.04;

  ctx.textAlign = "center";
  ctx.fillStyle = CANVAS_FOREGROUND_MUTED;
  ctx.font = `600 ${Math.round(width * 0.03)}px "Sora Canvas", system-ui, sans-serif`;
  ctx.fillText("Scan to vote", centerX, y);

  drawFooter(ctx, centerX, height * 0.95, width * 0.5, width * 0.022);

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
  ctx.fillStyle = CANVAS_BACKGROUND;
  ctx.fillRect(0, 0, width, height);

  const margin = width * 0.06;
  const qrSize = height * 0.6;
  const qrPadding = height * 0.035;
  const qrX = width - qrSize - margin - qrPadding;
  const qrY = (height - qrSize) / 2;
  drawQrCard(ctx, qrImage, qrX, qrY, qrSize, qrPadding);

  const textX = margin;
  const textMaxWidth = qrX - qrPadding - textX - margin;
  let y = height * 0.36;

  if (logoImage) {
    const logoSize = height * 0.15;
    ctx.drawImage(logoImage, textX, y - logoSize - height * 0.045, logoSize, logoSize);
  }

  ctx.textAlign = "left";
  ctx.fillStyle = CANVAS_FOREGROUND;
  ctx.font = `bold ${Math.round(height * 0.085)}px "Sora Canvas", system-ui, sans-serif`;
  ctx.fillText(lobby.title, textX, y, textMaxWidth);

  y += height * 0.035;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = Math.max(2, height * 0.008);
  ctx.beginPath();
  ctx.moveTo(textX, y);
  ctx.lineTo(textX + height * 0.12, y);
  ctx.stroke();
  y += height * 0.09;

  const codeFontSize = Math.round(height * 0.1);
  const pillHeight = drawCodePill(ctx, lobby.code, accentColor, textX, y, codeFontSize, "left");
  y += pillHeight + height * 0.06;

  ctx.fillStyle = CANVAS_FOREGROUND_MUTED;
  ctx.font = `600 ${Math.round(height * 0.04)}px "Sora Canvas", system-ui, sans-serif`;
  ctx.fillText("Scan to vote", textX, y);

  ctx.fillStyle = CANVAS_CAPTION;
  ctx.font = `600 ${Math.round(height * 0.03)}px "Sora Canvas", system-ui, sans-serif`;
  ctx.fillText("Powered by Votero", textX, height * 0.93);
}

async function renderPosterCanvas(
  lobby: Lobby,
  qrDataUrl: string,
  preset: PosterPreset,
): Promise<HTMLCanvasElement> {
  await ensureCanvasFontsLoaded();
  const qrImage = await loadImage(qrDataUrl);
  let logoImage: HTMLImageElement | undefined;
  if (lobby.brandLogoUrl) {
    try {
      logoImage = await loadImage(lobby.brandLogoUrl);
    } catch {
      // Proceed unbranded rather than blocking the whole poster over a logo that failed to load.
    }
  }
  const accentColor = lobby.brandColor ?? "#17325A"; // brand-700, the app's own default accent

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

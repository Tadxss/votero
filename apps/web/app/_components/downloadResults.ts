import type { Lobby, QuestionTally, SurveyQuestion } from "@repo/types";
import { loadImage } from "./loadImage";
import { ensureCanvasFontsLoaded } from "./loadCanvasFonts";

// Same fixed hue order as TallyBars'/TextResponseCloud's light-mode --series-* vars — a downloaded
// file is a static artifact with no CSS variables to inherit, and light-mode colors are the safer
// universal default since the file may be viewed/printed anywhere.
const SERIES_COLORS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
];

// Same hues as SERIES_COLORS at low alpha — matches TextResponseCloud's badge background swatches.
const SERIES_BG_COLORS = [
  "rgba(42, 120, 214, 0.14)",
  "rgba(235, 104, 52, 0.14)",
  "rgba(27, 175, 122, 0.14)",
  "rgba(237, 161, 0, 0.14)",
  "rgba(232, 123, 164, 0.14)",
  "rgba(0, 131, 0, 0.14)",
  "rgba(74, 58, 167, 0.14)",
  "rgba(227, 73, 72, 0.14)",
];

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

function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// A ranked question's PNG/bar rendering shows the final IRV round's standing only — round-by-round
// detail is an on-screen-only view (RankedResults), same "final standing" simplification the CSV
// export uses. Shaped like TallyEntry[] so it can reuse the exact same bar-drawing code as choice.
function finalStandingTally(rounds: { round: number; counts: Record<string, number> }[]) {
  const finalRound = rounds[rounds.length - 1];
  if (!finalRound) return [];
  return Object.entries(finalRound.counts)
    .map(([optionId, count]) => ({ optionId, count }))
    .sort((a, b) => b.count - a.count);
}

export function downloadResultsCsv(
  lobby: Lobby,
  questions: SurveyQuestion[],
  tally: QuestionTally[],
) {
  const rows: (string | number)[][] = [
    ["Lobby", lobby.title],
    ["Code", lobby.code],
    ["Status", lobby.status],
    ["Voters joined", lobby.joinedCount],
    ["Votes cast", lobby.votesCount],
    [],
    ["Question", "Answer", "Count"],
  ];

  for (const q of tally) {
    if (q.type === "choice") {
      const question = questions.find((qq) => qq.id === q.questionId);
      for (const entry of q.tally) {
        const label = question?.options.find((o) => o.id === entry.optionId)?.label ?? "Unknown option";
        rows.push([q.questionTitle, label, entry.count]);
      }
    } else if (q.type === "ranked") {
      // Final standing only — round-by-round detail is a results-page/on-screen-only view, not
      // meaningful in a flat CSV row.
      const question = questions.find((qq) => qq.id === q.questionId);
      const finalRound = q.rounds[q.rounds.length - 1];
      const standing = finalRound
        ? Object.entries(finalRound.counts).sort(([, a], [, b]) => b - a)
        : [];
      standing.forEach(([optionId, count], index) => {
        const label = question?.options.find((o) => o.id === optionId)?.label ?? "Unknown option";
        rows.push([q.questionTitle, `#${index + 1} ${label}`, count]);
      });
    } else {
      for (const response of q.responses) {
        rows.push([q.questionTitle, response.text, response.count]);
      }
    }
  }

  const csv = rows.map((row) => row.map(csvField).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `votero-${slugifyForFilename(lobby.title)}-${lobby.code}.csv`);
}

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

// Winner indicator, drawn instead of a 🏆 emoji glyph — canvas can't render a React icon
// component, so this is a plain 5-point star polygon (alternating outer/inner radius over 10
// vertices), matching the same "small solid accent-colored badge" idea as TallyBars' Trophy icon.
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerRadius: number,
  color: string,
) {
  const innerRadius = outerRadius * 0.45;
  const spikes = 5;
  const step = Math.PI / spikes;
  let rot = -Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
  for (let i = 0; i < spikes; i++) {
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

interface ChipLayout {
  label: string;
  x: number;
  y: number; // top of the chip's line, relative to the chip section's own origin
  width: number;
  height: number;
  fontSize: number;
  color: string;
  bgColor: string;
}

const CHIP_PAD_X_RATIO = 0.7;
const CHIP_PAD_Y_RATIO = 0.35;

// A response can be up to 300 characters — full sentences don't read as a "collective thoughts"
// cloud at a glance, so badges get a short preview, matching TextResponseCloud's on-screen
// truncation (the full text is only ever shown there, via a hover tooltip a static image can't
// offer — acceptable, since the CSV export already has every response's full, untruncated text).
function truncateForChip(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

// Flow-layout for text-question chips, mirroring TextResponseCloud's fixed-size pill-badge look
// (see that component for why frequency no longer drives size — the "×N" count already says that)
// — computed with a throwaway measuring context first (canvas has no native text wrapping), since
// the image's total height must be known before the real canvas is sized.
function layoutChips(
  measureCtx: CanvasRenderingContext2D,
  responses: { text: string; count: number }[],
  availableWidth: number,
  fontSize: number,
  previewChars: number,
): { chips: ChipLayout[]; height: number } {
  const lineHeight = fontSize * (1 + 2 * CHIP_PAD_Y_RATIO);
  const gapX = 10;
  const gapY = 10;

  let x = 0;
  let lineTop = 0;
  const chips: ChipLayout[] = [];

  responses.forEach((r, index) => {
    const label = truncateForChip(r.text, previewChars) + (r.count > 1 ? ` ×${r.count}` : "");
    measureCtx.font = `600 ${fontSize}px "Sora Canvas", system-ui, sans-serif`;
    const textWidth = measureCtx.measureText(label).width;
    const padX = fontSize * CHIP_PAD_X_RATIO;
    const padY = fontSize * CHIP_PAD_Y_RATIO;
    const chipWidth = textWidth + padX * 2;
    const chipHeight = fontSize + padY * 2;

    if (x > 0 && x + chipWidth > availableWidth) {
      x = 0;
      lineTop += lineHeight + gapY;
    }

    chips.push({
      label,
      x,
      y: lineTop,
      width: chipWidth,
      height: chipHeight,
      fontSize,
      color: SERIES_COLORS[index % SERIES_COLORS.length]!,
      bgColor: SERIES_BG_COLORS[index % SERIES_BG_COLORS.length]!,
    });
    x += chipWidth + gapX;
  });

  return { chips, height: lineTop + lineHeight };
}

interface RenderResultsOpts {
  // Present only for the branded PDF report — downloadResultsImage calls this with no opts, so its
  // output stays pixel-identical to before this existed (badge-cloud.spec.ts/free-text.spec.ts
  // already assert on it).
  logoImage?: HTMLImageElement;
  accentColor?: string;
}

// Extracted so the branded PDF report (downloadBrandedReportPdf below) can reuse the exact same
// drawing logic with a logo + accent color overlaid, instead of duplicating it.
async function renderResultsCanvas(
  lobby: Lobby,
  questions: SurveyQuestion[],
  tally: QuestionTally[],
  opts: RenderResultsOpts = {},
): Promise<HTMLCanvasElement | undefined> {
  await ensureCanvasFontsLoaded();
  const { logoImage, accentColor } = opts;
  const width = 900;
  const padding = 48;
  const logoSize = 48;
  const titleHeight = 64;
  const titleX = logoImage ? padding + logoSize + 16 : padding;
  const showQuestionHeadings = questions.length > 1;
  const questionHeaderHeight = showQuestionHeadings ? 40 : 12;
  const rowHeight = 52;
  const questionGap = 20;
  const footerHeight = 36;
  const labelWidth = 220;
  const countWidth = 50;
  const chipFontSize = 15;
  const chipPreviewChars = 20;

  const measureCtx = document.createElement("canvas").getContext("2d")!;
  const questionContent = tally.map((q) => {
    if (q.type === "choice") {
      return { contentHeight: q.tally.length * rowHeight };
    }
    if (q.type === "ranked") {
      return { contentHeight: finalStandingTally(q.rounds).length * rowHeight };
    }
    const { chips, height } = layoutChips(
      measureCtx,
      q.responses,
      width - padding * 2,
      chipFontSize,
      chipPreviewChars,
    );
    return { contentHeight: height, chips };
  });

  const totalContentHeight = questionContent.reduce((sum, c) => sum + c.contentHeight, 0);
  const height =
    padding * 2 +
    titleHeight +
    tally.length * questionHeaderHeight +
    totalContentHeight +
    Math.max(0, tally.length - 1) * questionGap +
    footerHeight;

  const scale = 2; // crisper output than the CSS pixel size
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  ctx.fillStyle = "#f7f9fc"; // matches --background
  ctx.fillRect(0, 0, width, height);

  let y = padding;

  if (logoImage) {
    ctx.drawImage(logoImage, padding, y, logoSize, logoSize);
  }

  ctx.fillStyle = "#1a1d23"; // matches --foreground
  ctx.font = `bold 28px "Sora Canvas", system-ui, sans-serif`;
  ctx.fillText(lobby.title, titleX, y + 26);

  ctx.fillStyle = "#5b6472"; // matches --foreground-muted
  ctx.font = `16px "Sora Canvas", system-ui, sans-serif`;
  ctx.fillText(
    `${lobby.status === "closed" ? "Final results" : "Live results"} · ${lobby.votesCount} ${lobby.votesCount === 1 ? "vote" : "votes"} cast`,
    titleX,
    y + 50,
  );
  y += titleHeight;

  if (accentColor) {
    ctx.fillStyle = accentColor;
    roundRect(ctx, padding, y - 12, width - padding * 2, 4, 2);
    ctx.fill();
  }

  const barX = padding + labelWidth;
  const barMaxWidth = width - padding - countWidth - barX;

  tally.forEach((q, qIndex) => {
    const question = questions.find((qq) => qq.id === q.questionId);
    const content = questionContent[qIndex]!;

    if (showQuestionHeadings) {
      ctx.font = `600 18px "Sora Canvas", system-ui, sans-serif`;
      ctx.fillStyle = "#5b6472";
      ctx.textAlign = "left";
      ctx.fillText(q.questionTitle, padding, y + 24);
    }
    y += questionHeaderHeight;

    if (q.type === "choice" || q.type === "ranked") {
      const barTally = q.type === "choice" ? q.tally : finalStandingTally(q.rounds);
      const maxCount = Math.max(1, ...barTally.map((t) => t.count));
      const winners = barTally.filter((t) => t.count > 0 && t.count === maxCount);
      const winnerOptionId =
        lobby.status === "closed" && winners.length === 1 ? winners[0]?.optionId : null;

      barTally.forEach((entry, oIndex) => {
        const label = question?.options.find((o) => o.id === entry.optionId)?.label ?? "Unknown option";
        const barWidth = maxCount > 0 ? (entry.count / maxCount) * barMaxWidth : 0;
        const barCenterY = y + rowHeight / 2;

        const isWinner = entry.optionId === winnerOptionId;
        let labelX = padding;
        if (isWinner) {
          drawStar(ctx, padding + 6, barCenterY, 6, accentColor ?? "#eda100");
          labelX = padding + 16;
        }

        ctx.font = `500 16px "Sora Canvas", system-ui, sans-serif`;
        ctx.fillStyle = "#1a1d23";
        ctx.textAlign = "left";
        ctx.fillText(label, labelX, barCenterY + 5, labelWidth - 12 - (labelX - padding));

        ctx.fillStyle = "#e5e8ed";
        roundRect(ctx, barX, barCenterY - 10, barMaxWidth, 20, 10);
        ctx.fill();

        if (barWidth > 0) {
          ctx.fillStyle = SERIES_COLORS[oIndex % SERIES_COLORS.length]!;
          roundRect(ctx, barX, barCenterY - 10, Math.max(barWidth, 20), 20, 10);
          ctx.fill();
        }

        ctx.font = `500 15px "Sora Canvas", system-ui, sans-serif`;
        ctx.fillStyle = "#5b6472";
        ctx.textAlign = "right";
        ctx.fillText(String(entry.count), width - padding, barCenterY + 5);
        ctx.textAlign = "left";

        y += rowHeight;
      });
    } else {
      for (const chip of content.chips ?? []) {
        const chipX = padding + chip.x;
        const chipY = y + chip.y;

        ctx.fillStyle = chip.bgColor;
        roundRect(ctx, chipX, chipY, chip.width, chip.height, chip.height / 2);
        ctx.fill();

        ctx.font = `600 ${chip.fontSize}px "Sora Canvas", system-ui, sans-serif`;
        ctx.fillStyle = chip.color;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(chip.label, chipX + chip.fontSize * CHIP_PAD_X_RATIO, chipY + chip.height / 2);
        ctx.textBaseline = "alphabetic";
      }
      y += content.contentHeight;
    }

    if (qIndex < tally.length - 1) y += questionGap;
  });

  y += footerHeight;
  ctx.font = `13px "Sora Canvas", system-ui, sans-serif`;
  ctx.fillStyle = "#8b93a1";
  ctx.fillText(`Voted via Votero · code ${lobby.code}`, padding, y - footerHeight / 2 + 5);

  return canvas;
}

export async function downloadResultsImage(
  lobby: Lobby,
  questions: SurveyQuestion[],
  tally: QuestionTally[],
) {
  const canvas = await renderResultsCanvas(lobby, questions, tally);
  if (!canvas) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    triggerDownload(blob, `votero-${slugifyForFilename(lobby.title)}-${lobby.code}.png`);
  }, "image/png");
}

// Branded PDF version of the same report — reuses renderResultsCanvas with the creator's logo/
// accent color overlaid (see docs/ARCHITECTURE.md's Build Order for the "why"), then slices the
// (potentially tall, for multi-question surveys) canvas across as many A4 pages as needed.
export async function downloadBrandedReportPdf(
  lobby: Lobby,
  questions: SurveyQuestion[],
  tally: QuestionTally[],
) {
  let logoImage: HTMLImageElement | undefined;
  if (lobby.brandLogoUrl) {
    try {
      logoImage = await loadImage(lobby.brandLogoUrl);
    } catch {
      // Proceed unbranded rather than blocking the whole report over a logo that failed to load.
    }
  }

  const canvas = await renderResultsCanvas(lobby, questions, tally, {
    logoImage,
    accentColor: lobby.brandColor ?? undefined,
  });
  if (!canvas) return;

  const { jsPDF } = await import("jspdf");
  const pageWidthMm = 210;
  const pageHeightMm = 297;
  const imgHeightMm = (canvas.height / canvas.width) * pageWidthMm;
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let renderedHeightMm = 0;
  let firstPage = true;
  while (renderedHeightMm < imgHeightMm) {
    if (!firstPage) pdf.addPage();
    // jsPDF clips addImage to the current page bounds — a growing negative Y offset walks the tall
    // source image upward one page-height at a time, the standard canvas-to-multipage-PDF slicing
    // technique (no manual sub-canvas cropping needed).
    pdf.addImage(imgData, "PNG", 0, -renderedHeightMm, pageWidthMm, imgHeightMm);
    renderedHeightMm += pageHeightMm;
    firstPage = false;
  }

  pdf.save(`votero-${slugifyForFilename(lobby.title)}-${lobby.code}-report.pdf`);
}

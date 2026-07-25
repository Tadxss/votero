import type { Lobby, QuestionTally, SurveyQuestion } from "@repo/types";

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

interface ChipLayout {
  text: string;
  x: number;
  y: number; // top of the chip's line, relative to the chip section's own origin
  fontSize: number;
  color: string;
}

// Flow-layout for text-question chips, mirroring TextResponseCloud's font-size-by-frequency
// sizing — computed with a throwaway measuring context first (canvas has no native text
// wrapping), since the image's total height must be known before the real canvas is sized.
// Simplification: every line uses one shared line-height (based on the section's own max font
// size), not a per-line max — occasional extra whitespace above smaller chips is an acceptable
// trade for not needing a second measurement pass per line.
function layoutChips(
  measureCtx: CanvasRenderingContext2D,
  responses: { text: string; count: number }[],
  availableWidth: number,
  minFontPx: number,
  maxFontPx: number,
): { chips: ChipLayout[]; height: number } {
  const maxCount = Math.max(1, ...responses.map((r) => r.count));
  const lineHeight = maxFontPx * 1.5;
  const gapX = 22;
  const gapY = 10;

  let x = 0;
  let lineTop = 0;
  const chips: ChipLayout[] = [];

  responses.forEach((r, index) => {
    const scale = r.count / maxCount;
    const fontSize = minFontPx + scale * (maxFontPx - minFontPx);
    const label = r.count > 1 ? `${r.text} ×${r.count}` : r.text;
    measureCtx.font = `600 ${fontSize}px system-ui, sans-serif`;
    const textWidth = measureCtx.measureText(label).width;

    if (x > 0 && x + textWidth > availableWidth) {
      x = 0;
      lineTop += lineHeight + gapY;
    }

    chips.push({
      text: label,
      x,
      y: lineTop,
      fontSize,
      color: SERIES_COLORS[index % SERIES_COLORS.length]!,
    });
    x += textWidth + gapX;
  });

  return { chips, height: lineTop + lineHeight };
}

export function downloadResultsImage(
  lobby: Lobby,
  questions: SurveyQuestion[],
  tally: QuestionTally[],
) {
  const width = 900;
  const padding = 48;
  const titleHeight = 64;
  const showQuestionHeadings = questions.length > 1;
  const questionHeaderHeight = showQuestionHeadings ? 40 : 12;
  const rowHeight = 52;
  const questionGap = 20;
  const footerHeight = 36;
  const labelWidth = 220;
  const countWidth = 50;
  const chipMinFont = 18;
  const chipMaxFont = 42;

  const measureCtx = document.createElement("canvas").getContext("2d")!;
  const questionContent = tally.map((q) => {
    if (q.type === "choice") {
      return { contentHeight: q.tally.length * rowHeight };
    }
    const { chips, height } = layoutChips(measureCtx, q.responses, width - padding * 2, chipMinFont, chipMaxFont);
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

  ctx.fillStyle = "#fff9f6"; // matches --background
  ctx.fillRect(0, 0, width, height);

  let y = padding;

  ctx.fillStyle = "#22132b"; // matches --foreground
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.fillText(lobby.title, padding, y + 26);

  ctx.fillStyle = "#6b5b73"; // matches --foreground-muted
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText(
    `${lobby.status === "closed" ? "Final results" : "Live results"} · ${lobby.votesCount} ${lobby.votesCount === 1 ? "vote" : "votes"} cast`,
    padding,
    y + 50,
  );
  y += titleHeight;

  const barX = padding + labelWidth;
  const barMaxWidth = width - padding - countWidth - barX;

  tally.forEach((q, qIndex) => {
    const question = questions.find((qq) => qq.id === q.questionId);
    const content = questionContent[qIndex]!;

    if (showQuestionHeadings) {
      ctx.font = "600 18px system-ui, sans-serif";
      ctx.fillStyle = "#6b5b73";
      ctx.textAlign = "left";
      ctx.fillText(q.questionTitle, padding, y + 24);
    }
    y += questionHeaderHeight;

    if (q.type === "choice") {
      const maxCount = Math.max(1, ...q.tally.map((t) => t.count));
      const winners = q.tally.filter((t) => t.count > 0 && t.count === maxCount);
      const winnerOptionId =
        lobby.status === "closed" && winners.length === 1 ? winners[0]?.optionId : null;

      q.tally.forEach((entry, oIndex) => {
        const label = question?.options.find((o) => o.id === entry.optionId)?.label ?? "Unknown option";
        const barWidth = maxCount > 0 ? (entry.count / maxCount) * barMaxWidth : 0;
        const barCenterY = y + rowHeight / 2;

        ctx.font = "500 16px system-ui, sans-serif";
        ctx.fillStyle = "#22132b";
        ctx.textAlign = "left";
        ctx.fillText(
          entry.optionId === winnerOptionId ? `🏆 ${label}` : label,
          padding,
          barCenterY + 5,
          labelWidth - 12,
        );

        ctx.fillStyle = "#ece3e0";
        roundRect(ctx, barX, barCenterY - 10, barMaxWidth, 20, 10);
        ctx.fill();

        if (barWidth > 0) {
          ctx.fillStyle = SERIES_COLORS[oIndex % SERIES_COLORS.length]!;
          roundRect(ctx, barX, barCenterY - 10, Math.max(barWidth, 20), 20, 10);
          ctx.fill();
        }

        ctx.font = "500 15px system-ui, sans-serif";
        ctx.fillStyle = "#6b5b73";
        ctx.textAlign = "right";
        ctx.fillText(String(entry.count), width - padding, barCenterY + 5);
        ctx.textAlign = "left";

        y += rowHeight;
      });
    } else {
      for (const chip of content.chips ?? []) {
        ctx.font = `600 ${chip.fontSize}px system-ui, sans-serif`;
        ctx.fillStyle = chip.color;
        ctx.textAlign = "left";
        ctx.fillText(chip.text, padding + chip.x, y + chip.y + chip.fontSize * 0.8);
      }
      y += content.contentHeight;
    }

    if (qIndex < tally.length - 1) y += questionGap;
  });

  y += footerHeight;
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillStyle = "#a89aa0";
  ctx.fillText(`Voted via Votero · code ${lobby.code}`, padding, y - footerHeight / 2 + 5);

  canvas.toBlob((blob) => {
    if (!blob) return;
    triggerDownload(blob, `votero-${slugifyForFilename(lobby.title)}-${lobby.code}.png`);
  }, "image/png");
}

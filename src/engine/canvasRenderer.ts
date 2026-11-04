import {
  FIVE_PROJECTS_DATA,
  LED_PROJECT_CODE,
  LESSON_ASSETS,
  LESSON_CHAPTERS,
  LESSON_METADATA,
  LessonSegment,
  TOTAL_DURATION_SEC,
  VisualSceneMode,
  formatSecondsMMSS,
  getChapterAtTime,
  getSegmentAtTime,
} from "../data/lessonData";
import { drawRiggedAmrCharacter } from "./riggedInstructor";

export interface LoadedStudioImages {
  amrPresenter: HTMLImageElement | null;
  amrPresenterOpen: HTMLImageElement | null;
  amrPresenterPoint: HTMLImageElement | null;
  amrAvatar: HTMLImageElement | null;
  amrAvatarOpen: HTMLImageElement | null;
  amrAvatarGesture: HTMLImageElement | null;
  labBackdrop: HTMLImageElement | null;
  smartCar: HTMLImageElement | null;
  roboticsArm: HTMLImageElement | null;
}

export function preloadStudioImages(): Promise<LoadedStudioImages> {
  const loadOne = (src: string): Promise<HTMLImageElement | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  return Promise.all([
    loadOne(LESSON_ASSETS.amrPresenterUrl),
    loadOne(LESSON_ASSETS.amrPresenterTalkOpenUrl),
    loadOne(LESSON_ASSETS.amrPresenterTalkPointUrl),
    loadOne(LESSON_ASSETS.amrAvatarUrl),
    loadOne(LESSON_ASSETS.amrAvatarTalkOpenUrl),
    loadOne(LESSON_ASSETS.amrAvatarTalkGestureUrl),
    loadOne(LESSON_ASSETS.labBackdropUrl),
    loadOne(LESSON_ASSETS.smartCarUrl),
    loadOne(LESSON_ASSETS.roboticsArmUrl),
  ]).then(
    ([
      amrPresenter,
      amrPresenterOpen,
      amrPresenterPoint,
      amrAvatar,
      amrAvatarOpen,
      amrAvatarGesture,
      labBackdrop,
      smartCar,
      roboticsArm,
    ]) => ({
      amrPresenter,
      amrPresenterOpen,
      amrPresenterPoint,
      amrAvatar,
      amrAvatarOpen,
      amrAvatarGesture,
      labBackdrop,
      smartCar,
      roboticsArm,
    })
  );
}

export interface RenderFrameOptions {
  currentTimeSec: number;
  voiceAmplitude: number;
  isPlaying?: boolean;
  showSubtitles: boolean;
  images: LoadedStudioImages;
}

const BASE_W = 1920;
const BASE_H = 1080;

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function getSourceDims(
  src: HTMLImageElement | HTMLCanvasElement | null
): { w: number; h: number } | null {
  if (!src) return null;
  if (src instanceof HTMLCanvasElement) {
    return src.width > 0 && src.height > 0
      ? { w: src.width, h: src.height }
      : null;
  }
  return src.naturalWidth > 0 && src.naturalHeight > 0
    ? { w: src.naturalWidth, h: src.naturalHeight }
    : null;
}

function drawCoverImageWithCamera(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement | null,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  zoom = 1.03,
  panX = 0,
  panY = 0
): void {
  const dims = getSourceDims(img);
  if (!img || !dims) {
    const grad = ctx.createLinearGradient(dx, dy, dx + dw, dy + dh);
    grad.addColorStop(0, "#0F172A");
    grad.addColorStop(1, "#0B1120");
    ctx.fillStyle = grad;
    ctx.fillRect(dx, dy, dw, dh);
    return;
  }

  const imgRatio = dims.w / dims.h;
  const targetRatio = dw / dh;
  let baseSw = dims.w;
  let baseSh = dims.h;
  let baseSx = 0;
  let baseSy = 0;

  if (imgRatio > targetRatio) {
    baseSw = dims.h * targetRatio;
    baseSx = (dims.w - baseSw) / 2;
  } else {
    baseSh = dims.w / targetRatio;
    baseSy = (dims.h - baseSh) / 2;
  }

  const sw = baseSw / zoom;
  const sh = baseSh / zoom;
  const maxPanX = Math.max(0, (baseSw - sw) / 2);
  const maxPanY = Math.max(0, (baseSh - sh) / 2);

  const sx =
    baseSx + (baseSw - sw) / 2 + Math.max(-maxPanX, Math.min(maxPanX, panX));
  const sy =
    baseSy + (baseSh - sh) / 2 + Math.max(-maxPanY, Math.min(maxPanY, panY));

  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.restore();
}

/**
 * Draws a realistic 85-inch Studio Interactive Smartboard bezel + anti-glare screen + stylus tray.
 */
function drawSmartboardBezel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  boardLabel: string
): void {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 12;

  // Brushed dark-titanium outer frame
  roundRectPath(ctx, x, y, w, h, 20);
  const frameGrad = ctx.createLinearGradient(x, y, x, y + h);
  frameGrad.addColorStop(0, "#334155");
  frameGrad.addColorStop(0.5, "#1E293B");
  frameGrad.addColorStop(1, "#0F172A");
  ctx.fillStyle = frameGrad;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, x, y, w, h, 20);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.42)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner anti-glare smartboard chalkboard-navy surface
  const pad = 10;
  const sx = x + pad;
  const sy = y + pad;
  const sw = w - pad * 2;
  const sh = h - pad * 2;
  roundRectPath(ctx, sx, sy, sw, sh, 13);
  const screenGrad = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
  screenGrad.addColorStop(0, "#07101F");
  screenGrad.addColorStop(0.6, "#060D1A");
  screenGrad.addColorStop(1, "#030712");
  ctx.fillStyle = screenGrad;
  ctx.fill();

  // Subtle smartboard engineering dot-grid
  ctx.save();
  roundRectPath(ctx, sx, sy, sw, sh, 13);
  ctx.clip();
  ctx.strokeStyle = "rgba(56, 189, 248, 0.045)";
  ctx.lineWidth = 1;
  for (let gx = sx + 48; gx < sx + sw; gx += 48) {
    ctx.beginPath();
    ctx.moveTo(gx, sy);
    ctx.lineTo(gx, sy + sh);
    ctx.stroke();
  }
  for (let gy = sy + 48; gy < sy + sh; gy += 48) {
    ctx.beginPath();
    ctx.moveTo(sx, gy);
    ctx.lineTo(sx + sw, gy);
    ctx.stroke();
  }
  ctx.restore();

  // Top-left subtle Smartboard status badge
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.fillStyle = "#22C55E";
  ctx.beginPath();
  ctx.arc(sx + 22, sy + 20, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(148, 163, 184, 0.72)";
  ctx.font = '600 12px "IBM Plex Mono", monospace';
  ctx.fillText(boardLabel, sx + 34, sy + 24);

  // Bottom metallic marker & stylus tray
  const trayW = Math.min(420, w * 0.36);
  const trayX = x + w / 2 - trayW / 2;
  const trayY = y + h - 4;
  roundRectPath(ctx, trayX, trayY, trayW, 13, 5);
  ctx.fillStyle = "#334155";
  ctx.fill();
  ctx.strokeStyle = "#64748B";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Colored smartboard styluses resting on tray
  const pens = [
    { ox: 42, color: "#22D3EE" },
    { ox: 128, color: "#FACC15" },
    { ox: 214, color: "#EF4444" },
  ];
  for (const p of pens) {
    roundRectPath(ctx, trayX + p.ox, trayY + 3, 58, 5, 2.5);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws rich interactive visual notes on the Smartboard during Full-Stage Intro & Outro scenes.
 */
function drawFullStageSmartboardContent(
  ctx: CanvasRenderingContext2D,
  seg: LessonSegment,
  effectiveAmp: number,
  timeSec: number
): void {
  const bx = 68;
  const by = 104;
  const bw = 1015;
  const bh = 668;

  drawSmartboardBezel(
    ctx,
    bx,
    by,
    bw,
    bh,
    "SMARTBOARD 4K · AMR AHMED ROBOTICS LAB"
  );

  const rx = bx + bw - 38;
  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "right";

  // Instructor & Lab Header
  ctx.fillStyle = "#22D3EE";
  ctx.font = '700 21px "Cairo", sans-serif';
  ctx.fillText(
    `${LESSON_METADATA.instructorName} · ${LESSON_METADATA.instructorRole}`,
    rx,
    by + 68
  );

  // Main Headline on Smartboard
  ctx.fillStyle = "#F8FAFC";
  ctx.font = '800 38px "Cairo", sans-serif';
  const headline =
    seg.sceneMode === VisualSceneMode.OUTRO_CAMERA
      ? "المهندس الشاطر بيفهم إزاي الحاجة بتشتغل وليه!"
      : LESSON_METADATA.title;
  const titleLines = wrapArabicText(ctx, headline, bw - 84);
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, rx, by + 128 + idx * 54);
  });

  // Divider accent line
  const afterTitleY = by + 130 + titleLines.length * 54;
  const lineGrad = ctx.createLinearGradient(bx + 44, 0, rx, 0);
  lineGrad.addColorStop(0, "rgba(34, 211, 238, 0.05)");
  lineGrad.addColorStop(1, "rgba(34, 211, 238, 0.65)");
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx + 44, afterTitleY);
  ctx.lineTo(rx, afterTitleY);
  ctx.stroke();

  if (seg.sceneMode === VisualSceneMode.OUTRO_CAMERA) {
    // Outro Smartboard Summary Takeaways
    const takeaways = [
      "✓ فهمنا عقل الأردوينو ATmega328P ومنافذ الطاقة والإشارات",
      "✓ كتبنا الكود في setup() و loop() بدون حفظ أعمى",
      "✓ بنينا أول دائرة LED حقيقية بمقاومة حماية 220Ω سليمة",
    ];
    ctx.font = '700 23px "Cairo", sans-serif';
    takeaways.forEach((item, idx) => {
      const cardY = afterTitleY + 26 + idx * 72;
      roundRectPath(ctx, bx + 48, cardY, bw - 92, 58, 12);
      ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
      ctx.fill();
      ctx.strokeStyle = idx === 2 ? "#FACC15" : "rgba(34, 211, 238, 0.35)";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.fillStyle = idx === 2 ? "#FDE047" : "#E2E8F0";
      ctx.fillText(item, rx - 22, cardY + 38);
    });
  } else {
    // Intro Smartboard Roadmap Cards + Live Mini UNO Diagram
    const roadmap = [
      { num: "01", label: "يعني إيه Arduino وإزاي بيفكر؟" },
      { num: "02", label: "تشريح لوحة Arduino UNO R3" },
      { num: "03", label: "البرمجة العملية على Arduino IDE" },
      { num: "04", label: "توصيل وتشغيل أول مشروع LED" },
    ];

    drawArduinoUnoR3(ctx, bx + 235, afterTitleY + 178, 0.56, {
      ledLActive: Math.floor(timeSec * 2) % 2 === 0,
      timeSec,
    });

    roadmap.forEach((step, idx) => {
      const cy = afterTitleY + 24 + idx * 74;
      const cx = bx + 440;
      const cw = bw - 480;
      const isActive =
        (seg.id === "seg-01" && idx === 0) ||
        (seg.id === "seg-02" && (idx === 0 || idx === 1)) ||
        (seg.id === "seg-03" && idx >= 2);

      roundRectPath(ctx, cx, cy, cw, 60, 12);
      ctx.fillStyle = isActive
        ? "rgba(8, 51, 68, 0.9)"
        : "rgba(15, 23, 42, 0.82)";
      ctx.fill();
      ctx.strokeStyle = isActive ? "#22D3EE" : "rgba(148, 163, 184, 0.25)";
      ctx.lineWidth = isActive ? 2 : 1.2;
      ctx.stroke();

      ctx.direction = "ltr";
      ctx.textAlign = "left";
      ctx.fillStyle = isActive ? "#FACC15" : "#38BDF8";
      ctx.font = '700 18px "IBM Plex Mono", monospace';
      ctx.fillText(step.num, cx + 18, cy + 37);

      ctx.direction = "rtl";
      ctx.textAlign = "right";
      ctx.fillStyle = "#F8FAFC";
      ctx.font = '700 20px "Cairo", sans-serif';
      ctx.fillText(step.label, cx + cw - 20, cy + 38);
    });
  }

  // Live Voice Waveform Indicator at bottom of Smartboard
  const waveY = by + bh - 40;
  for (let i = 0; i < 26; i++) {
    const h =
      effectiveAmp > 0.03
        ? 6 +
          24 *
            effectiveAmp *
            (0.4 + 0.6 * Math.abs(Math.sin(timeSec * 10 + i * 0.55)))
        : 5;
    roundRectPath(ctx, rx - i * 15 - 8, waveY - h / 2, 7, h, 3.5);
    ctx.fillStyle = i % 3 === 0 ? "#FACC15" : "#22D3EE";
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Electronics Lab Workbench across the studio foreground in Full-Stage scenes,
 * naturally grounding Eng. Amr's waist behind real lab tools & nameplate.
 */
function drawStudioLabBenchForeground(
  ctx: CanvasRenderingContext2D,
  effectiveAmp: number,
  timeSec: number
): void {
  const deskY = 790;
  ctx.save();

  // Top edge bevel of lab bench
  const topEdgeGrad = ctx.createLinearGradient(0, deskY, 0, deskY + 18);
  topEdgeGrad.addColorStop(0, "#334155");
  topEdgeGrad.addColorStop(1, "#1E293B");
  ctx.fillStyle = topEdgeGrad;
  ctx.fillRect(0, deskY, BASE_W, 18);

  // Cyan LED studio strip along workbench edge
  ctx.fillStyle = "rgba(34, 211, 238, 0.65)";
  ctx.fillRect(0, deskY, BASE_W, 3);

  // Main workbench front body
  const deskBodyGrad = ctx.createLinearGradient(0, deskY + 18, 0, BASE_H);
  deskBodyGrad.addColorStop(0, "#0F172A");
  deskBodyGrad.addColorStop(1, "#020617");
  ctx.fillStyle = deskBodyGrad;
  ctx.fillRect(0, deskY + 18, BASE_W, BASE_H - deskY - 18);

  // Anti-static green/teal electronics soldering mat on the bench right side
  ctx.fillStyle = "rgba(6, 95, 70, 0.45)";
  ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, 1140, deskY + 4, 590, 12, 4);
  ctx.fill();
  ctx.stroke();

  // Studio Nameplate Badge in front of Eng. Amr on the lab bench
  const badgeX = 1235;
  const badgeY = deskY + 26;
  const badgeW = 430;
  const badgeH = 66;
  roundRectPath(ctx, badgeX, badgeY, badgeW, badgeH, 14);
  ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
  ctx.fill();
  ctx.strokeStyle =
    effectiveAmp > 0.04 ? "#22D3EE" : "rgba(148, 163, 184, 0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#F8FAFC";
  ctx.font = '800 21px "Cairo", sans-serif';
  ctx.fillText("المهندس عمرو أحمد", badgeX + badgeW - 22, badgeY + 30);
  ctx.fillStyle = "#38BDF8";
  ctx.font = '600 15px "Cairo", sans-serif';
  ctx.fillText(
    "مهندس إلكترونيات وروبوتكس · شرح عملي بالمصري",
    badgeX + badgeW - 22,
    badgeY + 53
  );

  // Live audio indicator bars inside nameplate
  for (let b = 0; b < 5; b++) {
    const bh =
      effectiveAmp > 0.03
        ? 8 +
          24 *
            effectiveAmp *
            (0.45 + 0.55 * Math.abs(Math.sin(timeSec * 12 + b * 1.1)))
        : 6;
    roundRectPath(ctx, badgeX + 20 + b * 9, badgeY + 48 - bh, 5.5, bh, 2.5);
    ctx.fillStyle = b % 2 === 0 ? "#22D3EE" : "#FACC15";
    ctx.fill();
  }

  ctx.restore();
}

function wrapArabicText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface UnoPinCoords {
  pin13: { x: number; y: number };
  topGnd: { x: number; y: number };
  bottomGnd: { x: number; y: number };
  pin5V: { x: number; y: number };
}

function drawArduinoUnoR3(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  options: {
    highlightZone?: "MCU" | "DIGITAL" | "ANALOG" | "USB" | "POWER" | null;
    ledLActive?: boolean;
    txRxFlash?: boolean;
    timeSec?: number;
  } = {}
): UnoPinCoords {
  const {
    highlightZone = null,
    ledLActive = false,
    txRxFlash = false,
    timeSec = 0,
  } = options;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const bw = 620;
  const bh = 430;
  const bx = -bw / 2;
  const by = -bh / 2;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 18;

  ctx.beginPath();
  ctx.moveTo(bx + 14, by);
  ctx.lineTo(bx + bw - 28, by);
  ctx.lineTo(bx + bw, by + 28);
  ctx.lineTo(bx + bw, by + bh - 28);
  ctx.lineTo(bx + bw - 22, by + bh);
  ctx.lineTo(bx + 14, by + bh);
  ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - 14);
  ctx.lineTo(bx, by + 14);
  ctx.quadraticCurveTo(bx, by, bx + 14, by);
  ctx.closePath();

  const pcbGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
  pcbGrad.addColorStop(0, "#008C95");
  pcbGrad.addColorStop(0.55, "#007880");
  pcbGrad.addColorStop(1, "#005F66");
  ctx.fillStyle = pcbGrad;
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = 3;
  ctx.strokeStyle = "#22B8C2";
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = "rgba(56, 217, 226, 0.16)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(bx + 150 + i * 36, by + 48);
    ctx.lineTo(bx + 150 + i * 36, by + 125);
    ctx.lineTo(bx + 210 + i * 24, by + 235);
    ctx.stroke();
  }
  ctx.restore();

  const mountHoles = [
    [bx + 92, by + 28],
    [bx + bw - 38, by + 95],
    [bx + bw - 38, by + bh - 58],
    [bx + 108, by + bh - 28],
  ];
  for (const [mx, my] of mountHoles) {
    ctx.beginPath();
    ctx.arc(mx, my, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#EAB308";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(mx, my, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = "#0B1120";
    ctx.fill();
  }

  roundRectPath(ctx, bx + 22, by + 18, 44, 34, 6);
  ctx.fillStyle = "#CBD5E1";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx + 44, by + 35, 10, 0, Math.PI * 2);
  ctx.fillStyle = "#DC2626";
  ctx.fill();
  ctx.direction = "ltr";
  ctx.font = '600 11px "IBM Plex Mono", monospace';
  ctx.fillStyle = "#F8FAFC";
  ctx.textAlign = "center";
  ctx.fillText("RESET", bx + 44, by + 66);

  roundRectPath(ctx, bx - 26, by + 84, 104, 118, 6);
  const usbGrad = ctx.createLinearGradient(bx - 26, by + 84, bx + 78, by + 202);
  usbGrad.addColorStop(0, "#F1F5F9");
  usbGrad.addColorStop(0.5, "#94A3B8");
  usbGrad.addColorStop(1, "#CBD5E1");
  ctx.fillStyle = usbGrad;
  ctx.fill();
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#334155";
  ctx.font = '600 13px "IBM Plex Mono", monospace';
  ctx.fillText("USB", bx + 26, by + 148);

  roundRectPath(ctx, bx - 18, by + bh - 128, 112, 92, 6);
  ctx.fillStyle = "#1E293B";
  ctx.fill();
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#94A3B8";
  ctx.font = '600 11px "IBM Plex Mono", monospace';
  ctx.fillText("7-12V DC", bx + 38, by + bh - 77);

  roundRectPath(ctx, bx + 172, by + 195, 58, 26, 13);
  ctx.fillStyle = "#E2E8F0";
  ctx.fill();
  ctx.strokeStyle = "#64748B";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#1E293B";
  ctx.font = '600 10px "IBM Plex Mono", monospace';
  ctx.fillText("16MHz", bx + 201, by + 212);

  const icX = bx + 258;
  const icY = by + 246;
  const icW = 290;
  const icH = 82;

  ctx.fillStyle = "#CBD5E1";
  for (let p = 0; p < 14; p++) {
    const px = icX + 14 + p * 19.8;
    ctx.fillRect(px, icY - 9, 8, 9);
    ctx.fillRect(px, icY + icH, 8, 9);
  }

  roundRectPath(ctx, icX, icY, icW, icH, 6);
  ctx.fillStyle = "#111827";
  ctx.fill();
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(icX, icY + icH / 2, 10, -Math.PI / 2, Math.PI / 2);
  ctx.fillStyle = "#1E293B";
  ctx.fill();

  ctx.fillStyle = "#E2E8F0";
  ctx.font = '600 16px "IBM Plex Mono", monospace';
  ctx.textAlign = "center";
  ctx.fillText("ATmega328P-PU", icX + icW / 2, icY + 38);
  ctx.fillStyle = "#94A3B8";
  ctx.font = '400 12px "IBM Plex Mono", monospace';
  ctx.fillText("MICROCONTROLLER", icX + icW / 2, icY + 59);

  ctx.save();
  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = '800 30px "Cairo", sans-serif';
  ctx.fillText("ARDUINO", bx + 250, by + 150);
  roundRectPath(ctx, bx + 412, by + 122, 82, 36, 6);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.fillStyle = "#007880";
  ctx.font = '800 24px "Cairo", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("UNO", bx + 453, by + 148);
  ctx.restore();

  const drawSmdLed = (
    lx: number,
    ly: number,
    label: string,
    on: boolean,
    color: string
  ) => {
    ctx.save();
    if (on) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
    }
    roundRectPath(ctx, lx - 8, ly - 5, 16, 10, 3);
    ctx.fillStyle = on ? color : "#334155";
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#F8FAFC";
    ctx.font = '600 11px "IBM Plex Mono", monospace';
    ctx.textAlign = "left";
    ctx.fillText(label, lx + 14, ly + 4);
  };

  drawSmdLed(bx + 518, by + 195, "ON", true, "#22C55E");
  drawSmdLed(bx + 205, by + 118, "L", ledLActive, "#F59E0B");
  const flashTx = txRxFlash && Math.floor(timeSec * 10) % 2 === 0;
  const flashRx = txRxFlash && Math.floor(timeSec * 10 + 1) % 2 === 0;
  drawSmdLed(bx + 205, by + 146, "TX", flashTx, "#F59E0B");
  drawSmdLed(bx + 205, by + 168, "RX", flashRx, "#F59E0B");

  const topHeaderY = by + 22;
  const pitch = 22;

  roundRectPath(ctx, bx + 138, topHeaderY - 10, 10 * pitch + 8, 22, 3);
  ctx.fillStyle = "#0F172A";
  ctx.fill();

  roundRectPath(ctx, bx + 374, topHeaderY - 10, 8 * pitch + 8, 22, 3);
  ctx.fillStyle = "#0F172A";
  ctx.fill();

  const topLeftLabels = [
    "SCL",
    "SDA",
    "AREF",
    "GND",
    "13",
    "12",
    "~11",
    "~10",
    "~9",
    "8",
  ];
  const topRightLabels = ["7", "~6", "~5", "4", "~3", "2", "TX1", "RX0"];

  let pin13Local = { x: 0, y: topHeaderY };
  let topGndLocal = { x: 0, y: topHeaderY };

  ctx.font = '600 10.5px "IBM Plex Mono", monospace';
  ctx.textAlign = "center";

  topLeftLabels.forEach((lbl, i) => {
    const hx = bx + 153 + i * pitch;
    ctx.fillStyle = "#020617";
    ctx.fillRect(hx - 4.5, topHeaderY - 4, 9, 9);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.strokeRect(hx - 4.5, topHeaderY - 4, 9, 9);

    ctx.save();
    ctx.translate(hx, topHeaderY + 26);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = lbl === "13" || lbl === "GND" ? "#FDE047" : "#F8FAFC";
    ctx.fillText(lbl, 0, 4);
    ctx.restore();

    if (lbl === "13") pin13Local = { x: hx, y: topHeaderY };
    if (lbl === "GND") topGndLocal = { x: hx, y: topHeaderY };
  });

  topRightLabels.forEach((lbl, i) => {
    const hx = bx + 389 + i * pitch;
    ctx.fillStyle = "#020617";
    ctx.fillRect(hx - 4.5, topHeaderY - 4, 9, 9);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.strokeRect(hx - 4.5, topHeaderY - 4, 9, 9);

    ctx.save();
    ctx.translate(hx, topHeaderY + 26);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#F8FAFC";
    ctx.fillText(lbl, 0, 4);
    ctx.restore();
  });

  ctx.fillStyle = "#E0F2FE";
  ctx.font = '700 12px "IBM Plex Mono", monospace';
  ctx.textAlign = "center";
  ctx.fillText("DIGITAL (PWM ~)", bx + 365, topHeaderY + 66);

  const botHeaderY = by + bh - 22;
  const powerLabels = ["IOREF", "RST", "3.3V", "5V", "GND", "GND", "VIN"];
  const analogLabels = ["A0", "A1", "A2", "A3", "A4", "A5"];

  roundRectPath(ctx, bx + 188, botHeaderY - 11, 7 * pitch + 8, 22, 3);
  ctx.fillStyle = "#0F172A";
  ctx.fill();

  roundRectPath(ctx, bx + 374, botHeaderY - 11, 6 * pitch + 8, 22, 3);
  ctx.fillStyle = "#0F172A";
  ctx.fill();

  let bottomGndLocal = { x: 0, y: botHeaderY };
  let pin5VLocal = { x: 0, y: botHeaderY };

  ctx.font = '600 10.5px "IBM Plex Mono", monospace';
  powerLabels.forEach((lbl, i) => {
    const hx = bx + 203 + i * pitch;
    ctx.fillStyle = "#020617";
    ctx.fillRect(hx - 4.5, botHeaderY - 4.5, 9, 9);
    ctx.strokeStyle = "#475569";
    ctx.strokeRect(hx - 4.5, botHeaderY - 4.5, 9, 9);

    ctx.save();
    ctx.translate(hx, botHeaderY - 22);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "left";
    ctx.fillStyle =
      lbl === "5V" ? "#FCA5A5" : lbl === "GND" ? "#FDE047" : "#F8FAFC";
    ctx.fillText(lbl, 0, 4);
    ctx.restore();

    if (lbl === "GND" && i === 4) bottomGndLocal = { x: hx, y: botHeaderY };
    if (lbl === "5V") pin5VLocal = { x: hx, y: botHeaderY };
  });

  analogLabels.forEach((lbl, i) => {
    const hx = bx + 389 + i * pitch;
    ctx.fillStyle = "#020617";
    ctx.fillRect(hx - 4.5, botHeaderY - 4.5, 9, 9);
    ctx.strokeStyle = "#475569";
    ctx.strokeRect(hx - 4.5, botHeaderY - 4.5, 9, 9);

    ctx.save();
    ctx.translate(hx, botHeaderY - 22);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "left";
    ctx.fillStyle = "#BAE6FD";
    ctx.fillText(lbl, 0, 4);
    ctx.restore();
  });

  ctx.fillStyle = "#E0F2FE";
  ctx.font = '700 12px "IBM Plex Mono", monospace';
  ctx.textAlign = "center";
  ctx.fillText("POWER", bx + 269, botHeaderY - 68);
  ctx.fillText("ANALOG IN", bx + 444, botHeaderY - 68);

  if (highlightZone) {
    const pulse = 0.65 + 0.35 * Math.sin(timeSec * 5);
    ctx.save();
    ctx.strokeStyle = `rgba(250, 204, 21, ${pulse})`;
    ctx.lineWidth = 4;
    ctx.shadowColor = "#FACC15";
    ctx.shadowBlur = 22;

    if (highlightZone === "MCU") {
      roundRectPath(ctx, icX - 12, icY - 16, icW + 24, icH + 32, 10);
    } else if (highlightZone === "DIGITAL") {
      roundRectPath(ctx, bx + 132, topHeaderY - 18, 430, 62, 10);
    } else if (highlightZone === "ANALOG") {
      roundRectPath(ctx, bx + 366, botHeaderY - 58, 152, 76, 10);
    } else if (highlightZone === "USB") {
      roundRectPath(ctx, bx - 34, by + 76, 120, 134, 10);
    } else if (highlightZone === "POWER") {
      roundRectPath(ctx, bx + 180, botHeaderY - 58, 174, 76, 10);
    }
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  return {
    pin13: { x: cx + pin13Local.x * scale, y: cy + pin13Local.y * scale },
    topGnd: { x: cx + topGndLocal.x * scale, y: cy + topGndLocal.y * scale },
    bottomGnd: {
      x: cx + bottomGndLocal.x * scale,
      y: cy + bottomGndLocal.y * scale,
    },
    pin5V: { x: cx + pin5VLocal.x * scale, y: cy + pin5VLocal.y * scale },
  };
}

/**
 * Renders Full-Body Skeletal-Rigged Eng. Amr Ahmed standing live next to the Interactive Smartboard,
 * using 2-bone IK arms + telescopic smartboard pointer wand + studio lectern badge!
 */
function drawSmartboardSideInstructorStage(
  ctx: CanvasRenderingContext2D,
  segmentId: string,
  effectiveAmp: number,
  timeSec: number,
  pointerTarget?: { x: number; y: number } | null
): void {
  // Subtle warm studio keylight halo behind Eng. Amr
  ctx.save();
  const halo = ctx.createRadialGradient(195, 520, 30, 195, 520, 240);
  halo.addColorStop(0, "rgba(34, 211, 238, 0.14)");
  halo.addColorStop(1, "rgba(34, 211, 238, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(195, 520, 240, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Full-body articulated Eng. Amr reaching across onto the Smartboard!
  drawRiggedAmrCharacter(ctx, {
    anchorX: 192,
    anchorY: 762,
    scale: 0.93,
    timeSec,
    voiceAmplitude: effectiveAmp,
    mode: "smartboard_side",
    segmentId,
    pointerTarget,
  });

  // Sleek Studio Lab Console / Lectern grounding his waist cleanly at bottom-left
  const lx = 24;
  const ly = 752;
  const lw = 336;
  const lh = 88;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 20;
  roundRectPath(ctx, lx, ly, lw, lh, 16);
  const lecGrad = ctx.createLinearGradient(lx, ly, lx, ly + lh);
  lecGrad.addColorStop(0, "#1E293B");
  lecGrad.addColorStop(1, "#0F172A");
  ctx.fillStyle = lecGrad;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, lx, ly, lw, lh, 16);
  ctx.lineWidth = 2;
  ctx.strokeStyle =
    effectiveAmp > 0.04 ? "#22D3EE" : "rgba(148, 163, 184, 0.35)";
  ctx.stroke();

  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#F8FAFC";
  ctx.font = '800 19px "Cairo", sans-serif';
  ctx.fillText("م. عمرو أحمد", lx + lw - 18, ly + 36);

  ctx.fillStyle = "#38BDF8";
  ctx.font = '600 14px "Cairo", sans-serif';
  ctx.fillText("يشرح عملياً على السبورة الذكية", lx + lw - 18, ly + 64);

  // Live audio waveform bars on lectern
  for (let b = 0; b < 5; b++) {
    const wave =
      effectiveAmp > 0.03
        ? Math.max(
            5,
            (10 + 24 * effectiveAmp) *
              (0.5 + 0.5 * Math.abs(Math.sin(timeSec * 12 + b * 1.2)))
          )
        : 5;
    roundRectPath(ctx, lx + 18 + b * 8.5, ly + 64 - wave, 5.5, wave, 2.5);
    ctx.fillStyle = b % 2 === 0 ? "#22D3EE" : "#FACC15";
    ctx.fill();
  }
  ctx.restore();
}

function drawIsometricBox(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  height: number,
  topColor: string,
  leftColor: string,
  rightColor: string,
  strokeColor: string
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry - height);
  ctx.lineTo(cx + rx, cy - height);
  ctx.lineTo(cx, cy + ry - height);
  ctx.lineTo(cx - rx, cy - height);
  ctx.closePath();
  ctx.fillStyle = topColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - rx, cy - height);
  ctx.lineTo(cx, cy + ry - height);
  ctx.lineTo(cx, cy + ry);
  ctx.lineTo(cx - rx, cy);
  ctx.closePath();
  ctx.fillStyle = leftColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + rx, cy - height);
  ctx.lineTo(cx, cy + ry - height);
  ctx.lineTo(cx, cy + ry);
  ctx.lineTo(cx + rx, cy);
  ctx.closePath();
  ctx.fillStyle = rightColor;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawConcept3DScene(
  ctx: CanvasRenderingContext2D,
  seg: LessonSegment,
  timeSec: number
): { x: number; y: number } {
  ctx.save();
  ctx.strokeStyle = "rgba(56, 189, 248, 0.07)";
  ctx.lineWidth = 1.5;
  for (let i = -12; i <= 12; i++) {
    ctx.beginPath();
    ctx.moveTo(960 + i * 110 - 600, 220);
    ctx.lineTo(960 + i * 110 + 600, 920);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(960 + i * 110 + 600, 220);
    ctx.lineTo(960 + i * 110 - 600, 920);
    ctx.stroke();
  }
  ctx.restore();

  const hover1 = Math.sin(timeSec * 2.2) * 8;
  const hover2 = Math.sin(timeSec * 2.2 + 1.2) * 10;
  const hover3 = Math.sin(timeSec * 2.2 + 2.4) * 8;

  const p1 = { x: 1565, y: 555 + hover1 };
  const p2 = { x: 1085, y: 520 + hover2 };
  const p3 = { x: 605, y: 555 + hover3 };

  const drawConduit = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    color: string
  ) => {
    ctx.save();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();

    const t = (timeSec * 0.65) % 1;
    const px = ax + (bx - ax) * t;
    const py = ay + (by - ay) * t;
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawConduit(p1.x - 140, p1.y - 30, p2.x + 165, p2.y - 35, "#38BDF8");
  drawConduit(p2.x - 165, p2.y - 35, p3.x + 140, p3.y - 30, "#F59E0B");

  drawIsometricBox(
    ctx,
    p1.x,
    p1.y,
    150,
    80,
    34,
    "#1E293B",
    "#0F172A",
    "#020617",
    "#38BDF8"
  );
  roundRectPath(ctx, p1.x - 125, p1.y - 195, 250, 120, 12);
  ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
  ctx.fill();
  ctx.strokeStyle = "#38BDF8";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.font = '600 16px "IBM Plex Mono", monospace';
  ctx.fillStyle = "#38BDF8";
  ctx.fillText("void loop() {", p1.x - 105, p1.y - 158);
  ctx.fillStyle = "#FDE047";
  ctx.fillText("  digitalWrite(13, HIGH);", p1.x - 105, p1.y - 130);
  ctx.fillStyle = "#38BDF8";
  ctx.fillText("}", p1.x - 105, p1.y - 102);

  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.fillStyle = "#F8FAFC";
  ctx.font = '700 24px "Cairo", sans-serif';
  ctx.fillText("1. الأوامر البرمجية", p1.x, p1.y + 128);
  ctx.fillStyle = "#94A3B8";
  ctx.font = '400 18px "Cairo", sans-serif';
  ctx.fillText("تكتب الكود على الكمبيوتر", p1.x, p1.y + 158);

  drawIsometricBox(
    ctx,
    p2.x,
    p2.y,
    190,
    102,
    46,
    "#008C95",
    "#006870",
    "#004D54",
    "#22D3EE"
  );
  drawIsometricBox(
    ctx,
    p2.x,
    p2.y - 46,
    85,
    44,
    24,
    "#1E293B",
    "#0F172A",
    "#020617",
    "#FACC15"
  );
  ctx.direction = "ltr";
  ctx.textAlign = "center";
  ctx.fillStyle = "#FACC15";
  ctx.font = '700 16px "IBM Plex Mono", monospace';
  ctx.fillText("Arduino Brain", p2.x, p2.y - 72);

  ctx.direction = "rtl";
  ctx.fillStyle = "#F8FAFC";
  ctx.font = '700 26px "Cairo", sans-serif';
  ctx.fillText("2. عقل الأردوينو", p2.x, p2.y + 145);
  ctx.fillStyle = "#94A3B8";
  ctx.font = '400 18px "Cairo", sans-serif';
  ctx.fillText("يفهم الكود ويحوله لإشارات كهربائية", p2.x, p2.y + 176);

  drawIsometricBox(
    ctx,
    p3.x,
    p3.y,
    150,
    80,
    34,
    "#1E293B",
    "#0F172A",
    "#020617",
    "#F59E0B"
  );
  const ledGlow = 0.6 + 0.4 * Math.sin(timeSec * 4);
  ctx.save();
  ctx.shadowColor = "#EF4444";
  ctx.shadowBlur = 32 * ledGlow;
  ctx.fillStyle = "#EF4444";
  ctx.beginPath();
  ctx.arc(p3.x - 42, p3.y - 115, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(p3.x + 42, p3.y - 115);
  ctx.rotate(timeSec * 1.6);
  ctx.strokeStyle = "#F59E0B";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.stroke();
  for (let g = 0; g < 8; g++) {
    const a = (g * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20);
    ctx.lineTo(Math.cos(a) * 31, Math.sin(a) * 31);
    ctx.stroke();
  }
  ctx.restore();

  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.fillStyle = "#F8FAFC";
  ctx.font = '700 24px "Cairo", sans-serif';
  ctx.fillText("3. التحكم في الأجهزة", p3.x, p3.y + 128);
  ctx.fillStyle = "#94A3B8";
  ctx.font = '400 18px "Cairo", sans-serif';
  ctx.fillText("إضاءة · مواتير · روبوتات ذكية", p3.x, p3.y + 158);

  if (seg.keyTermAr) {
    roundRectPath(ctx, 705, 165, 760, 62, 14);
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#38BDF8";
    ctx.font = '700 22px "Cairo", sans-serif';
    ctx.fillText(seg.keyTermAr, 1085, 204);
  }

  return { x: p2.x, y: p2.y - 55 };
}

function drawUnoExplorationScene(
  ctx: CanvasRenderingContext2D,
  seg: LessonSegment,
  timeSec: number
): { x: number; y: number } {
  let targetScale = 1.12;
  let targetX = 1110;
  let targetY = 470;
  let highlightZone: "MCU" | "DIGITAL" | "ANALOG" | "USB" | "POWER" | null =
    null;
  let detailTitle = "لوحة Arduino UNO R3 القياسية";
  let detailBody =
    "مصممة خصيصاً للمبتدئين والمهندسين: كل المنافذ مرقمة بوضوح وجاهزة للتوصيل المباشر بأسلاك التجارب بدون أي لحام.";
  let badgeEn = "ATmega328P · 5V Logic · 14 Digital · 6 Analog";
  let pointerTarget = { x: 1110, y: 470 };

  switch (seg.sceneMode) {
    case VisualSceneMode.UNO_ZOOM_MCU:
      targetScale = 1.38;
      targetX = 885;
      targetY = 395;
      highlightZone = "MCU";
      detailTitle = "المعالج الدقيق Microcontroller";
      detailBody =
        "شريحة ATmega328P هي مخ البوردة؛ يُحفظ بداخلها الكود حتى لو فصلت الكهرباء، وتنفذ حتى 16 مليون عملية في الثانية.";
      badgeEn = "ATmega328P · 32KB Flash · 16 MHz";
      pointerTarget = { x: 995, y: 500 };
      break;
    case VisualSceneMode.UNO_ZOOM_DIGITAL:
      targetScale = 1.38;
      targetX = 885;
      targetY = 595;
      highlightZone = "DIGITAL";
      detailTitle = "الأرجل الرقمية Digital Pins (0 – 13)";
      detailBody =
        "تتعامل مع الإشارات الرقمية الثنائية فقط: إما HIGH (تخرج 5 فولت لتشغيل القطعة) أو LOW (0 فولت لإيقافها).";
      badgeEn = "Pins 0..13 · HIGH = 5V · LOW = 0V";
      pointerTarget = { x: 910, y: 340 };
      break;
    case VisualSceneMode.UNO_ZOOM_ANALOG:
      targetScale = 1.38;
      targetX = 875;
      targetY = 335;
      highlightZone = "ANALOG";
      detailTitle = "الأرجل التماثلية Analog Pins (A0 – A5)";
      detailBody =
        "تقرأ الفولت المتغير من الحساسات (من 0V إلى 5V) وتحوله داخل الكود إلى رقم متدرج من 0 إلى 1023.";
      badgeEn = "A0..A5 · 10-Bit ADC (0 – 1023)";
      pointerTarget = { x: 1055, y: 605 };
      break;
    case VisualSceneMode.UNO_ZOOM_USB:
      targetScale = 1.38;
      targetX = 955;
      targetY = 475;
      highlightZone = "USB";
      detailTitle = "منفذ الـ USB (برمجة + طاقة)";
      detailBody =
        "يربط لوحة Arduino UNO بالكمبيوتر لرفع الأكواد من برنامج Arduino IDE، ويمد اللوحة بجهد 5V للتشغيل الفوري.";
      badgeEn = "USB Type-B · Serial Data + 5V Supply";
      pointerTarget = { x: 565, y: 425 };
      break;
    case VisualSceneMode.UNO_ZOOM_POWER:
      targetScale = 1.38;
      targetX = 895;
      targetY = 335;
      highlightZone = "POWER";
      detailTitle = "منافذ الطاقة والأرضي Power Pins";
      detailBody =
        "تضم مخارج 5V و 3.3V لتغذية الحساسات، ومنفذَي GND (الأرضي السالب) لإغلاق الدائرة الكهربائية بأمان.";
      badgeEn = "5V · 3.3V · GND (0V) · VIN (7–12V)";
      pointerTarget = { x: 840, y: 605 };
      break;
    default:
      break;
  }

  drawArduinoUnoR3(ctx, targetX, targetY, targetScale, {
    highlightZone,
    ledLActive: Math.floor(timeSec * 1.5) % 2 === 0,
    txRxFlash: false,
    timeSec,
  });

  if (highlightZone) {
    const cardX = 1335;
    const cardY = 235;
    const cardW = 525;
    const cardH = 310;

    roundRectPath(ctx, cardX, cardY, cardW, cardH, 18);
    ctx.fillStyle = "rgba(15, 23, 42, 0.93)";
    ctx.fill();
    ctx.strokeStyle = "#FACC15";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.fillStyle = "#38BDF8";
    ctx.font = '600 15px "IBM Plex Mono", monospace';
    ctx.fillText(badgeEn, cardX + 26, cardY + 42);

    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = "#FACC15";
    ctx.font = '700 26px "Cairo", sans-serif';
    ctx.fillText(detailTitle, cardX + cardW - 26, cardY + 92);

    ctx.fillStyle = "#E2E8F0";
    ctx.font = '400 20px "Cairo", sans-serif';
    const wrapped = wrapArabicText(ctx, detailBody, cardW - 52);
    wrapped.forEach((line, idx) => {
      ctx.fillText(line, cardX + cardW - 26, cardY + 140 + idx * 36);
    });
  } else {
    roundRectPath(ctx, 640, 738, 940, 62, 14);
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.fill();
    ctx.strokeStyle = "rgba(34, 211, 238, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.fillStyle = "#E2E8F0";
    ctx.font = '600 20px "Cairo", sans-serif';
    ctx.fillText(detailBody, 1110, 777);
  }

  return pointerTarget;
}

function drawArduinoIdeScene(
  ctx: CanvasRenderingContext2D,
  seg: LessonSegment,
  timeSec: number
): { x: number; y: number } {
  const isUploading = seg.id === "seg-17";

  drawArduinoUnoR3(ctx, 650, 555, 0.72, {
    ledLActive: isUploading && Math.floor(timeSec * 4) % 2 === 0,
    txRxFlash: isUploading,
    timeSec,
  });

  ctx.save();
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 11;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(968, 515);
  ctx.bezierCurveTo(855, 515, 420, 385, 420, 505);
  ctx.stroke();

  if (isUploading) {
    const packetT = (timeSec * 0.9) % 1;
    const px = 968 - packetT * 545;
    const py = 508 + Math.sin(packetT * Math.PI) * -42;
    ctx.shadowColor = "#22D3EE";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#22D3EE";
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.direction = "ltr";
    ctx.font = '700 14px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#FDE047";
    ctx.fillText("0101101 -> USB", px - 45, py - 18);
  }
  ctx.restore();

  const ideX = 968;
  const ideY = 175;
  const ideW = 882;
  const ideH = 595;

  roundRectPath(ctx, ideX, ideY, ideW, ideH, 16);
  ctx.fillStyle = "#0F172A";
  ctx.fill();
  ctx.strokeStyle = "#00979D";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  roundRectPath(ctx, ideX, ideY, ideW, 64, 16);
  ctx.fillStyle = "#007880";
  ctx.fill();

  const verifyActive = isUploading && timeSec % 4 < 1.8;
  const uploadActive = isUploading && timeSec % 4 >= 1.8;

  ctx.beginPath();
  ctx.arc(ideX + 42, ideY + 32, 18, 0, Math.PI * 2);
  ctx.fillStyle = verifyActive ? "#FDE047" : "#E2E8F0";
  ctx.fill();
  ctx.direction = "ltr";
  ctx.textAlign = "center";
  ctx.fillStyle = "#0F172A";
  ctx.font = '700 18px "IBM Plex Mono", monospace';
  ctx.fillText("✓", ideX + 42, ideY + 38);

  ctx.beginPath();
  ctx.arc(ideX + 90, ideY + 32, 18, 0, Math.PI * 2);
  ctx.fillStyle = uploadActive ? "#FDE047" : "#E2E8F0";
  ctx.fill();
  ctx.fillStyle = "#0F172A";
  ctx.fillText("→", ideX + 90, ideY + 38);

  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = '600 17px "IBM Plex Mono", monospace';
  ctx.fillText(
    "first_project.ino — Arduino UNO (COM3)",
    ideX + 132,
    ideY + 38
  );

  LED_PROJECT_CODE.forEach((item, idx) => {
    const ly = ideY + 112 + idx * 44;
    const isHighlighted = seg.highlightCodeLines?.includes(item.lineNumber);

    if (isHighlighted) {
      roundRectPath(ctx, ideX + 18, ly - 26, ideW - 36, 38, 6);
      ctx.fillStyle = "rgba(34, 211, 238, 0.16)";
      ctx.fill();
    }

    ctx.direction = "ltr";
    ctx.textAlign = "right";
    ctx.fillStyle = "#64748B";
    ctx.font = '400 17px "IBM Plex Mono", monospace';
    ctx.fillText(String(item.lineNumber), ideX + 54, ly);

    ctx.textAlign = "left";
    ctx.fillStyle = isHighlighted ? "#FDE047" : "#E2E8F0";
    ctx.font = '600 19px "IBM Plex Mono", monospace';
    ctx.fillText(item.code, ideX + 78, ly);

    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = isHighlighted ? "#38BDF8" : "#94A3B8";
    ctx.font = '600 15px "Cairo", sans-serif';
    ctx.fillText(item.explanationAr, ideX + ideW - 26, ly);
  });

  roundRectPath(ctx, ideX + 16, ideY + ideH - 64, ideW - 32, 48, 8);
  ctx.fillStyle = "#020617";
  ctx.fill();
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.fillStyle = uploadActive ? "#22C55E" : "#38BDF8";
  ctx.font = '600 15px "IBM Plex Mono", monospace';
  ctx.fillText(
    isUploading
      ? uploadActive
        ? "Done uploading. Sketch uses 924 bytes (2%) of program storage space."
        : "Compiling sketch... Verifying syntax (0 errors)"
      : "Ready — Board: Arduino UNO (ATmega328P)",
    ideX + 34,
    ideY + ideH - 34
  );

  return isUploading ? { x: ideX + 90, y: ideY + 32 } : { x: ideX + 110, y: ideY + 150 };
}

function drawLedProjectScene(
  ctx: CanvasRenderingContext2D,
  seg: LessonSegment,
  timeSec: number
): { x: number; y: number } {
  const isLiveDemo = seg.sceneMode === VisualSceneMode.LED_LIVE_DEMO;
  const isResistorFocus = seg.sceneMode === VisualSceneMode.LED_RESISTOR_WHY;
  const isWiringStep = seg.sceneMode === VisualSceneMode.LED_WIRING;
  const showCodePanel =
    seg.sceneMode === VisualSceneMode.LED_CODE_SETUP ||
    seg.sceneMode === VisualSceneMode.LED_CODE_LOOP ||
    isLiveDemo;

  const blinkCycle = timeSec % 2.0;
  const isLedLit = isLiveDemo ? blinkCycle < 1.0 : false;

  const unoCoords = drawArduinoUnoR3(ctx, 610, 560, 0.63, {
    ledLActive: isLedLit,
    timeSec,
  });

  const bbX = 835;
  const bbY = 395;
  const bbW = 435;
  const bbH = 285;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 24;
  roundRectPath(ctx, bbX, bbY, bbW, bbH, 14);
  ctx.fillStyle = "#F8FAFC";
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 2;
  roundRectPath(ctx, bbX, bbY, bbW, bbH, 14);
  ctx.stroke();

  ctx.strokeStyle = "#EF4444";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bbX + 24, bbY + 24);
  ctx.lineTo(bbX + bbW - 24, bbY + 24);
  ctx.stroke();

  ctx.strokeStyle = "#3B82F6";
  ctx.beginPath();
  ctx.moveTo(bbX + 24, bbY + bbH - 24);
  ctx.lineTo(bbX + bbW - 24, bbY + bbH - 24);
  ctx.stroke();

  ctx.fillStyle = "#E2E8F0";
  ctx.fillRect(bbX + 12, bbY + bbH / 2 - 10, bbW - 24, 20);

  const colX = (col: number) => bbX + 34 + col * 17.2;
  const rowY = (rowIdx: number) => bbY + 52 + rowIdx * 16;

  for (let c = 0; c < 22; c++) {
    for (let r = 0; r < 5; r++) {
      ctx.fillStyle = "#334155";
      ctx.fillRect(colX(c) - 2.5, rowY(r) - 2.5, 5, 5);
      ctx.fillRect(colX(c) - 2.5, bbY + 170 + r * 16 - 2.5, 5, 5);
    }
  }

  const colSignal = 6;
  const colMid = 13;
  const colGnd = 16;

  if (isWiringStep || isLiveDemo) {
    ctx.fillStyle = "rgba(34, 197, 94, 0.22)";
    ctx.fillRect(colX(colSignal) - 6, rowY(0) - 6, 12, 76);
    ctx.fillRect(colX(colMid) - 6, rowY(0) - 6, 12, 76);
    ctx.fillRect(colX(colGnd) - 6, rowY(0) - 6, 12, 76);
  }

  const rStartX = colX(colSignal);
  const rEndX = colX(colMid);
  const rY = rowY(2);

  ctx.strokeStyle = "#94A3B8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(rStartX, rY);
  ctx.lineTo(rEndX, rY);
  ctx.stroke();

  const rbX = (rStartX + rEndX) / 2 - 34;
  roundRectPath(ctx, rbX, rY - 11, 68, 22, 8);
  ctx.fillStyle = "#FDE68A";
  ctx.fill();
  ctx.strokeStyle = "#B45309";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const bands = [
    { offset: 14, color: "#DC2626" },
    { offset: 25, color: "#DC2626" },
    { offset: 36, color: "#78350F" },
    { offset: 52, color: "#D97706" },
  ];
  bands.forEach((b) => {
    ctx.fillStyle = b.color;
    ctx.fillRect(rbX + b.offset, rY - 10, 5, 20);
  });

  ctx.direction = "ltr";
  ctx.textAlign = "center";
  ctx.fillStyle = "#0F172A";
  ctx.font = '700 13px "IBM Plex Mono", monospace';
  ctx.fillText("220Ω", rbX + 34, rY + 28);

  const anodeX = colX(colMid);
  const cathodeX = colX(colGnd);
  const legHoleY = rowY(0);
  const ledCenterX = (anodeX + cathodeX) / 2;
  const ledDomeY = bbY - 46;

  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(ledCenterX - 11, ledDomeY + 18);
  ctx.lineTo(anodeX, legHoleY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(ledCenterX + 11, ledDomeY + 18);
  ctx.lineTo(cathodeX, legHoleY);
  ctx.stroke();

  ctx.fillStyle = "#EF4444";
  ctx.font = '700 15px "IBM Plex Mono", monospace';
  ctx.fillText("+ Anode", anodeX - 18, bbY - 6);
  ctx.fillStyle = "#38BDF8";
  ctx.fillText("- Cathode", cathodeX + 26, bbY - 6);

  if (isLedLit) {
    ctx.save();
    const radial = ctx.createRadialGradient(
      ledCenterX,
      ledDomeY,
      6,
      ledCenterX,
      ledDomeY,
      118
    );
    radial.addColorStop(0, "rgba(255, 120, 120, 0.95)");
    radial.addColorStop(0.35, "rgba(239, 68, 68, 0.55)");
    radial.addColorStop(1, "rgba(239, 68, 68, 0)");
    ctx.fillStyle = radial;
    ctx.beginPath();
    ctx.arc(ledCenterX, ledDomeY, 118, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(ledCenterX, ledDomeY, 24, Math.PI, 0);
  ctx.lineTo(ledCenterX + 24, ledDomeY + 18);
  ctx.lineTo(ledCenterX - 24, ledDomeY + 18);
  ctx.closePath();
  ctx.fillStyle = isLedLit ? "#FF3B3B" : "#991B1B";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = isLedLit ? "#FCA5A5" : "#7F1D1D";
  ctx.stroke();
  ctx.restore();

  const segProgress = Math.max(
    0,
    Math.min(1, (timeSec - seg.startSec) / (seg.endSec - seg.startSec))
  );
  const wireReveal =
    seg.sceneMode === VisualSceneMode.LED_PARTS || isResistorFocus
      ? 0.25
      : isWiringStep
        ? segProgress
        : 1.0;

  if (wireReveal > 0) {
    ctx.save();
    ctx.strokeStyle = "#EF4444";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.setLineDash([900]);
    ctx.lineDashOffset = 900 * (1 - Math.min(1, wireReveal * 1.6));
    ctx.beginPath();
    ctx.moveTo(unoCoords.pin13.x, unoCoords.pin13.y);
    ctx.bezierCurveTo(
      unoCoords.pin13.x,
      unoCoords.pin13.y - 105,
      colX(colSignal),
      bbY - 85,
      colX(colSignal),
      rowY(4)
    );
    ctx.stroke();
    ctx.restore();

    if (wireReveal > 0.35) {
      const w2Prog = Math.min(1, (wireReveal - 0.35) / 0.65);
      ctx.save();
      ctx.strokeStyle = "#1E293B";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.setLineDash([900]);
      ctx.lineDashOffset = 900 * (1 - w2Prog);
      ctx.beginPath();
      ctx.moveTo(colX(colGnd), rowY(4));
      ctx.bezierCurveTo(
        colX(colGnd) + 45,
        bbY + 210,
        unoCoords.bottomGnd.x,
        unoCoords.bottomGnd.y + 90,
        unoCoords.bottomGnd.x,
        unoCoords.bottomGnd.y
      );
      ctx.stroke();
      ctx.strokeStyle = "#64748B";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  const rightX = 1295;
  const rightY = 195;
  const rightW = 558;
  const rightH = 545;

  roundRectPath(ctx, rightX, rightY, rightW, rightH, 18);
  ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
  ctx.fill();
  ctx.strokeStyle = isLedLit ? "#EF4444" : "#00979D";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  if (!showCodePanel) {
    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = "#FACC15";
    ctx.font = '700 25px "Cairo", sans-serif';
    ctx.fillText(
      isResistorFocus
        ? "ليه المقاومة 220Ω ضرورية جداً؟"
        : isWiringStep
          ? "مسار الدائرة المغلقة السليم 100%"
          : "قائمة مكونات المشروع الأول",
      rightX + rightW - 28,
      rightY + 56
    );

    const bullets = isResistorFocus
      ? [
          "• رجل الأردوينو Pin 13 بتخرج جهد 5 فولت.",
          "• الـ LED الأحمر بيستحمل حوالي 2 فولت وتيار 20mA أقصى حاجة.",
          "• بدون مقاومة: التيار هيعلى فجأة ويحرق الـ LED فوراً!",
          "• بالمقاومة 220Ω: التيار بيتحدد عند ~14mA بأمان تام.",
          "• الطرف الطويل (+) للمقاومة، والقصير (-) للأرضي GND.",
        ]
      : isWiringStep
        ? [
            "1. سلك أحمر من Digital Pin 13 إلى عمود المقاومة الأول.",
            "2. المقاومة 220Ω تعبر لعمود جديد مستقل على البردبورد.",
            "3. الطرف الطويل الموجب (Anode +) في نفس عمود طرف المقاومة.",
            "4. الطرف القصير السالب (Cathode -) في عمود مجاور مستقل.",
            "5. سلك أسود من عمود السالب راجع إلى منفذ GND بالأردوينو.",
          ]
        : [
            "1. لوحة Arduino UNO R3 القياسية.",
            "2. لوحة تجارب Breadboard للتوصيل بدون لحام.",
            "3. لمبة دايود ضوئي LED أحمر (5mm).",
            "4. مقاومة كهربائية 220Ω (أحمر · أحمر · بني · ذهبي).",
            "5. سلكين توصيل ذكر-ذكر (Jumper Wires).",
          ];

    ctx.fillStyle = "#E2E8F0";
    ctx.font = '600 20px "Cairo", sans-serif';
    bullets.forEach((b, i) => {
      ctx.fillText(b, rightX + rightW - 28, rightY + 125 + i * 74);
    });
  } else {
    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.fillStyle = "#38BDF8";
    ctx.font = '700 16px "IBM Plex Mono", monospace';
    ctx.fillText("first_led_amr_ahmed.ino", rightX + 26, rightY + 44);

    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = isLedLit ? "#FCA5A5" : "#94A3B8";
    ctx.font = '700 17px "Cairo", sans-serif';
    ctx.fillText(
      isLiveDemo
        ? isLedLit
          ? "الحالة الآن: HIGH (5V) — الـ LED مضيء"
          : "الحالة الآن: LOW (0V) — الـ LED منطفئ"
        : "شرح الكود سطراً بسطر",
      rightX + rightW - 24,
      rightY + 44
    );

    const activeLineInDemo = isLiveDemo
      ? blinkCycle < 0.2
        ? 5
        : blinkCycle < 1.0
          ? 6
          : blinkCycle < 1.2
            ? 7
            : 8
      : null;

    LED_PROJECT_CODE.forEach((item, idx) => {
      const ly = rightY + 98 + idx * 46;
      const highlighted = isLiveDemo
        ? item.lineNumber === activeLineInDemo
        : seg.highlightCodeLines?.includes(item.lineNumber);

      if (highlighted) {
        roundRectPath(ctx, rightX + 16, ly - 26, rightW - 32, 38, 6);
        ctx.fillStyle = isLedLit
          ? "rgba(239, 68, 68, 0.22)"
          : "rgba(34, 211, 238, 0.18)";
        ctx.fill();
      }

      ctx.direction = "ltr";
      ctx.textAlign = "left";
      ctx.fillStyle = highlighted ? "#FDE047" : "#F1F5F9";
      ctx.font = '600 18px "IBM Plex Mono", monospace';
      ctx.fillText(`${item.lineNumber}  ${item.code}`, rightX + 26, ly);
    });
  }

  return isResistorFocus
    ? { x: rbX + 34, y: rY }
    : showCodePanel && !isLiveDemo
      ? { x: rightX + 40, y: rightY + 190 }
      : { x: ledCenterX, y: ledDomeY };
}

function drawIoComparisonScene(
  ctx: CanvasRenderingContext2D,
  timeSec: number
): { x: number; y: number } {
  const inputs = [
    { ar: "زرار ضغط", en: "Push Button" },
    { ar: "حساس مسافة", en: "Ultrasonic HC-SR04" },
    { ar: "حساس حرارة", en: "DHT11 Sensor" },
    { ar: "حساس إضاءة", en: "LDR Photoresistor" },
  ];
  const outputs = [
    { ar: "إضاءة ليد", en: "LED Indicator" },
    { ar: "صافرة إنذار", en: "Piezo Buzzer" },
    { ar: "محرك روبوت", en: "Servo / DC Motor" },
    { ar: "تشغيل أجهزة", en: "Relay Module" },
  ];

  drawArduinoUnoR3(ctx, 985, 535, 0.58, {
    ledLActive: true,
    timeSec,
  });

  inputs.forEach((inp, i) => {
    const cy = 240 + i * 145;
    const cx = 1445;
    roundRectPath(ctx, cx, cy, 380, 104, 14);
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.fill();
    ctx.strokeStyle = "#38BDF8";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = "#F8FAFC";
    ctx.font = '700 22px "Cairo", sans-serif';
    ctx.fillText(inp.ar, cx + 354, cy + 44);

    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.fillStyle = "#38BDF8";
    ctx.font = '600 14px "IBM Plex Mono", monospace';
    ctx.fillText(`INPUT · ${inp.en}`, cx + 22, cy + 78);

    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 52);
    ctx.lineTo(1175, 535);
    ctx.stroke();

    const t = (timeSec * 0.7 + i * 0.25) % 1;
    const px = cx + (1175 - cx) * t;
    const py = cy + 52 + (535 - (cy + 52)) * t;
    ctx.fillStyle = "#38BDF8";
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  outputs.forEach((out, i) => {
    const cy = 370 + i * 115;
    const cx = 410;
    roundRectPath(ctx, cx, cy, 355, 92, 14);
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.fill();
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = "#F8FAFC";
    ctx.font = '700 20px "Cairo", sans-serif';
    ctx.fillText(out.ar, cx + 330, cy + 38);

    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.fillStyle = "#F59E0B";
    ctx.font = '600 13px "IBM Plex Mono", monospace';
    ctx.fillText(`OUTPUT · ${out.en}`, cx + 18, cy + 68);

    ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(795, 535);
    ctx.lineTo(cx + 355, cy + 46);
    ctx.stroke();

    const t = (timeSec * 0.7 + i * 0.25) % 1;
    const px = 795 + (cx + 355 - 795) * t;
    const py = 535 + (cy + 46 - 535) * t;
    ctx.fillStyle = "#F59E0B";
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  return { x: 985, y: 535 };
}

function drawProjectsShowcaseScene(
  ctx: CanvasRenderingContext2D,
  seg: LessonSegment,
  images: LoadedStudioImages,
  timeSec: number
): { x: number; y: number } {
  const featuredImg =
    seg.showcaseIndex === 2 ? images.smartCar : images.roboticsArm;

  const imgX = 395;
  const imgY = 215;
  const imgW = 545;
  const imgH = 520;

  ctx.save();
  roundRectPath(ctx, imgX, imgY, imgW, imgH, 20);
  ctx.clip();
  drawCoverImageWithCamera(
    ctx,
    featuredImg,
    imgX,
    imgY,
    imgW,
    imgH,
    1.04 + 0.02 * Math.sin(timeSec * 0.8),
    Math.sin(timeSec * 0.5) * 8,
    0
  );
  const imgScrim = ctx.createLinearGradient(
    imgX,
    imgY + imgH - 130,
    imgX,
    imgY + imgH
  );
  imgScrim.addColorStop(0, "rgba(2, 6, 23, 0)");
  imgScrim.addColorStop(1, "rgba(2, 6, 23, 0.92)");
  ctx.fillStyle = imgScrim;
  ctx.fillRect(imgX, imgY + imgH - 130, imgW, 130);

  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#F8FAFC";
  ctx.font = '700 20px "Cairo", sans-serif';
  ctx.fillText(
    seg.showcaseIndex === 2
      ? "سيارة ذكية تتفادى العوائق"
      : "ذراع روبوتي ونظام تحكم ذكي",
    imgX + imgW - 22,
    imgY + imgH - 32
  );
  ctx.restore();

  ctx.strokeStyle = "rgba(34, 211, 238, 0.45)";
  ctx.lineWidth = 2;
  roundRectPath(ctx, imgX, imgY, imgW, imgH, 20);
  ctx.stroke();

  FIVE_PROJECTS_DATA.forEach((proj, idx) => {
    const py = 195 + idx * 112;
    const px = 975;
    const pw = 875;
    const ph = 98;

    const isHighlighted =
      (seg.showcaseIndex === 0 && (idx === 0 || idx === 1)) ||
      (seg.showcaseIndex === 2 && idx === 2) ||
      (seg.showcaseIndex === 4 && (idx === 3 || idx === 4));

    roundRectPath(ctx, px, py, pw, ph, 14);
    ctx.fillStyle = isHighlighted
      ? "rgba(8, 51, 68, 0.92)"
      : "rgba(15, 23, 42, 0.86)";
    ctx.fill();
    ctx.strokeStyle = isHighlighted ? "#22D3EE" : "rgba(148, 163, 184, 0.22)";
    ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
    ctx.stroke();

    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = isHighlighted ? "#FACC15" : "#F8FAFC";
    ctx.font = '700 21px "Cairo", sans-serif';
    ctx.fillText(`${proj.index}. ${proj.titleAr}`, px + pw - 24, py + 38);

    ctx.fillStyle = "#CBD5E1";
    ctx.font = '400 17px "Cairo", sans-serif';
    ctx.fillText(proj.descriptionAr, px + pw - 24, py + 74);

    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.fillStyle = "#38BDF8";
    ctx.font = '600 13px "IBM Plex Mono", monospace';
    ctx.fillText(proj.componentsEn, px + 22, py + 36);
  });

  return { x: imgX + imgW / 2, y: imgY + imgH / 2 };
}

function drawSummaryRecapScene(ctx: CanvasRenderingContext2D): {
  x: number;
  y: number;
} {
  const pillars = [
    {
      num: "01",
      title: "مفهوم الأردوينو",
      desc: "عقل إلكتروني مفتوح المصدر يستقبل الأوامر البرمجية ويتحكم في العالم المادي.",
    },
    {
      num: "02",
      title: "تشريح Arduino UNO",
      desc: "فهمنا دور شريحة ATmega328P، ومنافذ Digital و Analog و USB و Power.",
    },
    {
      num: "03",
      title: "أول دائرة عملية سليمة",
      desc: "توصيل Pin 13 مع مقاومة حماية 220Ω والطرف الموجب للـ LED والعودة لـ GND.",
    },
    {
      num: "04",
      title: "منطق الروبوتكس",
      desc: "حساسات تقرأ (Inputs) ← كود يقرر في loop() ← مخرجات تنفذ الحركة (Outputs).",
    },
  ];

  pillars.forEach((p, idx) => {
    const col = idx % 2 === 0 ? 1140 : 405;
    const row = Math.floor(idx / 2);
    const y = 240 + row * 250;

    roundRectPath(ctx, col, y, 700, 215, 18);
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.fill();
    ctx.strokeStyle = "#00979D";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.fillStyle = "#22D3EE";
    ctx.font = '700 28px "IBM Plex Mono", monospace';
    ctx.fillText(p.num, col + 28, y + 54);

    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = "#FACC15";
    ctx.font = '700 25px "Cairo", sans-serif';
    ctx.fillText(p.title, col + 672, y + 58);

    ctx.fillStyle = "#E2E8F0";
    ctx.font = '400 20px "Cairo", sans-serif';
    const lines = wrapArabicText(ctx, p.desc, 630);
    lines.forEach((l, li) => {
      ctx.fillText(l, col + 672, y + 115 + li * 36);
    });
  });

  return { x: 1140, y: 340 };
}

export function renderStudioFrame(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  opts: RenderFrameOptions
): void {
  const {
    currentTimeSec,
    voiceAmplitude,
    isPlaying = false,
    showSubtitles,
    images,
  } = opts;
  const seg = getSegmentAtTime(currentTimeSec);
  const chapter = getChapterAtTime(currentTimeSec);

  // Ensure smooth visual mouth/gesture animation when playing even if audio is temporarily muted
  const simulatedCadence = isPlaying
    ? 0.42 + 0.35 * Math.abs(Math.sin(currentTimeSec * 6.2))
    : 0;
  const effectiveAmp =
    voiceAmplitude > 0.02 ? voiceAmplitude : simulatedCadence;

  ctx.save();
  ctx.scale(canvasWidth / BASE_W, canvasHeight / BASE_H);

  const isFullCamera =
    seg.sceneMode === VisualSceneMode.INTRO_CAMERA ||
    seg.sceneMode === VisualSceneMode.OUTRO_CAMERA;

  // Studio Lab Backdrop across the entire 1920x1080 studio room
  drawCoverImageWithCamera(
    ctx,
    images.labBackdrop,
    0,
    0,
    BASE_W,
    BASE_H,
    1.03,
    Math.sin(currentTimeSec * 0.25) * 5,
    0
  );
  ctx.fillStyle = isFullCamera
    ? "rgba(6, 11, 24, 0.80)"
    : "rgba(6, 11, 24, 0.86)";
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  if (isFullCamera) {
    // 1. Left-side 85-inch Interactive Smartboard with Lesson Overview / Outro Summary
    drawFullStageSmartboardContent(ctx, seg, effectiveAmp, currentTimeSec);

    // 2. Warm studio keylight glow behind Full-Body Rigged Eng. Amr Ahmed on the right
    ctx.save();
    const stageHalo = ctx.createRadialGradient(1455, 480, 40, 1455, 480, 360);
    stageHalo.addColorStop(0, "rgba(34, 211, 238, 0.16)");
    stageHalo.addColorStop(1, "rgba(34, 211, 238, 0)");
    ctx.fillStyle = stageHalo;
    ctx.beginPath();
    ctx.arc(1455, 480, 360, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Full-Body Articulated Eng. Amr Ahmed (2-bone IK arms, greeting wave, handheld UNO, 6-viseme mouth!)
    drawRiggedAmrCharacter(ctx, {
      anchorX: 1455,
      anchorY: 794,
      scale: seg.id === "seg-02" ? 1.27 : 1.21,
      timeSec: currentTimeSec,
      voiceAmplitude: effectiveAmp,
      mode: "full_stage",
      segmentId: seg.id,
      pointerTarget: { x: 920, y: 420 },
    });

    // 4. Electronics Lab Workbench across foreground
    drawStudioLabBenchForeground(ctx, effectiveAmp, currentTimeSec);
  } else {
    // 1. Right-side Interactive Studio Smartboard (`x = 376..1884, y = 92..838`)
    const sbX = 376;
    const sbY = 92;
    const sbW = 1508;
    const sbH = 746;
    drawSmartboardBezel(
      ctx,
      sbX,
      sbY,
      sbW,
      sbH,
      `INTERACTIVE SMARTBOARD · ${chapter.timeRangeLabel}`
    );

    let pointerTarget: { x: number; y: number } | null = null;

    // Clip Smartboard graphics cleanly inside the anti-glare Smartboard glass!
    ctx.save();
    roundRectPath(ctx, sbX + 10, sbY + 10, sbW - 20, sbH - 20, 13);
    ctx.clip();

    if (seg.sceneMode === VisualSceneMode.CONCEPT_3D) {
      pointerTarget = drawConcept3DScene(ctx, seg, currentTimeSec);
    } else if (
      seg.sceneMode === VisualSceneMode.UNO_OVERVIEW ||
      seg.sceneMode === VisualSceneMode.UNO_ZOOM_MCU ||
      seg.sceneMode === VisualSceneMode.UNO_ZOOM_DIGITAL ||
      seg.sceneMode === VisualSceneMode.UNO_ZOOM_ANALOG ||
      seg.sceneMode === VisualSceneMode.UNO_ZOOM_USB ||
      seg.sceneMode === VisualSceneMode.UNO_ZOOM_POWER
    ) {
      pointerTarget = drawUnoExplorationScene(ctx, seg, currentTimeSec);
    } else if (seg.sceneMode === VisualSceneMode.ARDUINO_IDE) {
      pointerTarget = drawArduinoIdeScene(ctx, seg, currentTimeSec);
    } else if (
      seg.sceneMode === VisualSceneMode.LED_PARTS ||
      seg.sceneMode === VisualSceneMode.LED_RESISTOR_WHY ||
      seg.sceneMode === VisualSceneMode.LED_WIRING ||
      seg.sceneMode === VisualSceneMode.LED_CODE_SETUP ||
      seg.sceneMode === VisualSceneMode.LED_CODE_LOOP ||
      seg.sceneMode === VisualSceneMode.LED_LIVE_DEMO
    ) {
      pointerTarget = drawLedProjectScene(ctx, seg, currentTimeSec);
    } else if (seg.sceneMode === VisualSceneMode.IO_COMPARISON) {
      pointerTarget = drawIoComparisonScene(ctx, currentTimeSec);
    } else if (seg.sceneMode === VisualSceneMode.PROJECTS_SHOWCASE) {
      pointerTarget = drawProjectsShowcaseScene(
        ctx,
        seg,
        images,
        currentTimeSec
      );
    } else if (seg.sceneMode === VisualSceneMode.SUMMARY_RECAP) {
      pointerTarget = drawSummaryRecapScene(ctx);
    }

    ctx.restore();

    // 2. Full-Body Articulated Eng. Amr Ahmed standing live next to the Smartboard & pointing!
    drawSmartboardSideInstructorStage(
      ctx,
      seg.id,
      effectiveAmp,
      currentTimeSec,
      pointerTarget
    );
  }

  // ==================== TOP BROADCAST CHAPTER HEADER ====================
  ctx.fillStyle = "rgba(2, 6, 23, 0.78)";
  ctx.fillRect(0, 0, BASE_W, 74);

  ctx.fillStyle = "rgba(148, 163, 184, 0.2)";
  ctx.fillRect(0, 71, BASE_W, 3);
  const progressRatio = Math.max(
    0,
    Math.min(1, currentTimeSec / TOTAL_DURATION_SEC)
  );
  ctx.fillStyle = "#00979D";
  ctx.fillRect(
    BASE_W * (1 - progressRatio),
    71,
    BASE_W * progressRatio,
    3
  );

  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#22D3EE";
  ctx.font = '700 20px "Cairo", sans-serif';
  ctx.fillText(
    `الفصل ${chapter.numberLabel} من 09 · ${chapter.title}`,
    BASE_W - 56,
    46
  );

  ctx.fillStyle = "#CBD5E1";
  ctx.font = '600 18px "Cairo", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(seg.onScreenTitle, BASE_W / 2, 46);

  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.fillStyle = "#F8FAFC";
  ctx.font = '600 19px "IBM Plex Mono", monospace';
  ctx.fillText(
    `${formatSecondsMMSS(currentTimeSec)} / ${formatSecondsMMSS(TOTAL_DURATION_SEC)}`,
    56,
    45
  );

  // ==================== MEASURED SCRIM & CLEAR ARABIC SUBTITLES ====================
  if (showSubtitles) {
    const subScrim = ctx.createLinearGradient(0, BASE_H - 220, 0, BASE_H);
    subScrim.addColorStop(0, "rgba(2, 6, 23, 0)");
    subScrim.addColorStop(0.45, "rgba(2, 6, 23, 0.78)");
    subScrim.addColorStop(1, "rgba(2, 6, 23, 0.95)");
    ctx.fillStyle = subScrim;
    ctx.fillRect(0, BASE_H - 220, BASE_W, 220);

    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.font = '700 28px "Cairo", sans-serif';
    const subLines = wrapArabicText(ctx, seg.narrationAr, 1560);
    const totalSubHeight = subLines.length * 42;
    const startSubY = BASE_H - 36 - (subLines.length - 1) * 42;

    roundRectPath(
      ctx,
      140,
      startSubY - 38,
      BASE_W - 280,
      totalSubHeight + 24,
      16
    );
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.28)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#F8FAFC";
    subLines.forEach((line, idx) => {
      ctx.fillText(line, BASE_W / 2, startSubY + idx * 42);
    });
  }

  const intoChapter = currentTimeSec - chapter.startSec;
  if (intoChapter >= 0 && intoChapter < 0.35 && chapter.id > 1) {
    const alpha = (1 - intoChapter / 0.35) * 0.35;
    ctx.fillStyle = `rgba(2, 6, 23, ${alpha})`;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
  }

  ctx.restore();
}

export function getTimelineChapterTicks(): {
  id: number;
  ratio: number;
  label: string;
}[] {
  return LESSON_CHAPTERS.map((ch) => ({
    id: ch.id,
    ratio: ch.startSec / TOTAL_DURATION_SEC,
    label: `${ch.numberLabel}. ${ch.title}`,
  }));
}

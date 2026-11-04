/**
 * Full-Body Articulated / Skeletal-Rigged Studio Engineer: المهندس عمرو أحمد
 * - True 2-Bone Inverse Kinematics (Shoulder -> Elbow -> Wrist) for both arms
 * - Smooth spring/cubic-eased gesture choreography (Greeting Wave, Self-Intro,
 *   Open-Palm Explain, Pointing at Held Arduino UNO, Smartboard Telescopic Pointer)
 * - Natural torso breathing, weight sway, head turn & nod, eye gaze tracking + blinking,
 *   expressive eyebrows, and 6-Viseme Arabic phonetic lip-sync with jaw/beard motion.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface RiggedAmrOptions {
  /** Waist/hip anchor X in 1920x1080 studio coordinates */
  anchorX: number;
  /** Waist/hip anchor Y in 1920x1080 studio coordinates */
  anchorY: number;
  /** Overall character scale (e.g. 1.08 for Full Stage, 0.84 for Smartboard Side) */
  scale: number;
  /** Current timeline position in seconds */
  timeSec: number;
  /** Real or envelope-driven voice amplitude [0..1] */
  voiceAmplitude: number;
  /** Presentation mode */
  mode: "full_stage" | "smartboard_side";
  /** Active segment ID for context-aware gestures (e.g. greeting wave on seg-01) */
  segmentId: string;
  /** Optional smartboard coordinate (1920x1080 space) Eng. Amr is explaining */
  pointerTarget?: Point2D | null;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

/**
 * Exact 2-Bone Inverse Kinematics solver using Law of Cosines.
 * Guarantees anatomically natural elbow bend direction and zero bone stretching.
 */
function solveTwoBoneIK(
  shoulder: Point2D,
  target: Point2D,
  upperLen: number,
  foreLen: number,
  bendDir: 1 | -1
): { elbow: Point2D; wrist: Point2D } {
  const dx = target.x - shoulder.x;
  const dy = target.y - shoulder.y;
  const rawDist = Math.hypot(dx, dy) || 0.001;
  const maxReach = upperLen + foreLen - 3;
  const minReach = Math.abs(upperLen - foreLen) + 8;
  const dist = clamp(rawDist, minReach, maxReach);

  const ux = dx / rawDist;
  const uy = dy / rawDist;
  const clampedWrist: Point2D = {
    x: shoulder.x + ux * dist,
    y: shoulder.y + uy * dist,
  };

  const cosShoulder = clamp(
    (upperLen * upperLen + dist * dist - foreLen * foreLen) /
      (2 * upperLen * dist),
    -1,
    1
  );
  const baseAngle = Math.atan2(dy, dx);
  const shoulderAngle = baseAngle + bendDir * Math.acos(cosShoulder);

  const elbow: Point2D = {
    x: shoulder.x + Math.cos(shoulderAngle) * upperLen,
    y: shoulder.y + Math.sin(shoulderAngle) * upperLen,
  };

  return { elbow, wrist: clampedWrist };
}

/**
 * Draws a tapered, rounded anatomical limb segment (upper arm or forearm with rolled cuff).
 */
function drawTaperedLimb(
  ctx: CanvasRenderingContext2D,
  p1: Point2D,
  p2: Point2D,
  r1: number,
  r2: number,
  fillStyle: string | CanvasGradient,
  strokeColor?: string
): void {
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p1.x + nx * r1, p1.y + ny * r1);
  ctx.lineTo(p2.x + nx * r2, p2.y + ny * r2);
  ctx.arc(p2.x, p2.y, r2, angle + Math.PI / 2, angle - Math.PI / 2, true);
  ctx.lineTo(p1.x - nx * r1, p1.y - ny * r1);
  ctx.arc(p1.x, p1.y, r1, angle - Math.PI / 2, angle + Math.PI / 2, true);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws a miniature handheld Arduino UNO R3 prop in Eng. Amr's hand during Full-Stage scenes.
 */
function drawHandheldMiniUno(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angleRad: number,
  timeSec: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angleRad);

  const w = 112;
  const h = 76;
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;

  // Teal PCB body
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 6);
  ctx.fillStyle = "#00878F";
  ctx.fill();
  ctx.strokeStyle = "#22D3EE";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Silver USB port
  ctx.fillStyle = "#CBD5E1";
  ctx.fillRect(-w / 2 - 6, -h / 2 + 12, 18, 22);
  ctx.strokeStyle = "#64748B";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-w / 2 - 6, -h / 2 + 12, 18, 22);

  // Black DC barrel jack
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(-w / 2 - 4, h / 2 - 24, 18, 16);

  // Pin headers top & bottom
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(-w / 2 + 22, -h / 2 + 4, w - 30, 7);
  ctx.fillRect(-w / 2 + 28, h / 2 - 11, w - 36, 7);

  // ATmega328P DIP IC
  ctx.fillStyle = "#1E293B";
  ctx.fillRect(-6, 4, 48, 16);
  ctx.strokeStyle = "#94A3B8";
  ctx.lineWidth = 1;
  ctx.strokeRect(-6, 4, 48, 16);

  // Blinking onboard LED + power LED
  ctx.fillStyle = "#22C55E";
  ctx.beginPath();
  ctx.arc(36, -12, 3, 0, Math.PI * 2);
  ctx.fill();

  const blinkOn = Math.floor(timeSec * 2) % 2 === 0;
  ctx.fillStyle = blinkOn ? "#FACC15" : "#713F12";
  ctx.beginPath();
  ctx.arc(14, -14, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // UNO Silkscreen mark
  ctx.fillStyle = "#F8FAFC";
  ctx.font = '700 10px "IBM Plex Mono", monospace';
  ctx.textAlign = "center";
  ctx.fillText("UNO", 22, -2);

  ctx.restore();
}

/**
 * Draws an expressive articulated hand in one of 4 natural teaching poses:
 * - "wave": Open 5-finger greeting / explaining hand
 * - "point": Extended index finger pointing along `aimAngle`
 * - "pointer_rod": Hand gripping a sleek telescopic Smartboard pointer aimed at target
 * - "hold_board": Hand cradling the handheld Arduino UNO R3
 */
function drawExpressiveHand(
  ctx: CanvasRenderingContext2D,
  wrist: Point2D,
  forearmAngle: number,
  pose: "wave" | "point" | "pointer_rod" | "hold_board",
  timeSec: number,
  flipX = 1
): Point2D {
  ctx.save();
  ctx.translate(wrist.x, wrist.y);
  ctx.rotate(forearmAngle);
  ctx.scale(1, flipX);

  const skinFill = "#CE916B";
  const skinStroke = "#9A6242";

  if (pose === "hold_board") {
    // Palm cradling back of board + UNO board + thumb on edge
    ctx.fillStyle = skinFill;
    ctx.strokeStyle = skinStroke;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-4, -15, 28, 30, 10);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
    const boardPos = {
      x: wrist.x + Math.cos(forearmAngle) * 38,
      y: wrist.y + Math.sin(forearmAngle) * 38 - 8,
    };
    drawHandheldMiniUno(
      ctx,
      boardPos.x,
      boardPos.y,
      Math.sin(timeSec * 1.1) * 0.06 - 0.08,
      timeSec
    );

    // Draw thumb gripping bottom-left bezel of the UNO
    ctx.save();
    ctx.translate(wrist.x, wrist.y);
    ctx.rotate(forearmAngle);
    ctx.fillStyle = "#D79B76";
    ctx.strokeStyle = skinStroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(10, -8, 22, 11, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return boardPos;
  }

  if (pose === "wave") {
    // Open expressive teaching / greeting palm with 5 distinct fingers
    ctx.fillStyle = skinFill;
    ctx.strokeStyle = skinStroke;
    ctx.lineWidth = 1.5;

    // Palm base
    ctx.beginPath();
    ctx.roundRect(-4, -15, 26, 30, 9);
    ctx.fill();
    ctx.stroke();

    // Thumb angled upward
    ctx.save();
    ctx.translate(8, -13);
    ctx.rotate(-0.65);
    ctx.beginPath();
    ctx.roundRect(0, -5, 20, 9, 4.5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 4 Expressive fingers slightly fanned
    const fingerSpecs = [
      { y: -11, len: 24, rot: -0.16 },
      { y: -4, len: 27, rot: -0.04 },
      { y: 3, len: 25, rot: 0.07 },
      { y: 10, len: 20, rot: 0.19 },
    ];
    for (const f of fingerSpecs) {
      ctx.save();
      ctx.translate(19, f.y);
      ctx.rotate(f.rot);
      ctx.beginPath();
      ctx.roundRect(0, -4, f.len, 7.8, 3.8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    return {
      x: wrist.x + Math.cos(forearmAngle) * 42,
      y: wrist.y + Math.sin(forearmAngle) * 42,
    };
  }

  if (pose === "point" || pose === "pointer_rod") {
    ctx.fillStyle = skinFill;
    ctx.strokeStyle = skinStroke;
    ctx.lineWidth = 1.5;

    // Palm
    ctx.beginPath();
    ctx.roundRect(-4, -14, 25, 28, 8);
    ctx.fill();
    ctx.stroke();

    // Extended index finger
    ctx.beginPath();
    ctx.roundRect(16, -11, 28, 8.5, 4.2);
    ctx.fill();
    ctx.stroke();

    // Curled middle/ring/pinky fingers
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.roundRect(14 - i * 1.5, -1 + i * 5.5, 14, 7.2, 3.6);
      ctx.fill();
      ctx.stroke();
    }

    // Thumb tucked over curled fingers
    ctx.save();
    ctx.translate(8, -12);
    ctx.rotate(-0.35);
    ctx.beginPath();
    ctx.roundRect(0, -4, 18, 8.5, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    const tipX = wrist.x + Math.cos(forearmAngle) * 44;
    const tipY = wrist.y + Math.sin(forearmAngle) * 44;
    return { x: tipX, y: tipY };
  }

  ctx.restore();
  return wrist;
}

/**
 * Selects one of 6 phonetic Arabic mouth visemes smoothly from voice amplitude & time.
 * 0: Warm closed smile (Rest)
 * 1: Bilabial press م / ب
 * 2: Wide smile teeth ي / س / ت
 * 3: Natural medium conversational open َ / هـ
 * 4: Wide open vowel آ / ع
 * 5: Rounded vowel أو / و
 */
function computeSpeechVisemeState(
  timeSec: number,
  voiceAmp: number
): {
  jawDrop: number;
  mouthWidthFactor: number;
  openHeight: number;
  visemeId: number;
} {
  if (voiceAmp <= 0.04) {
    return {
      jawDrop: 0,
      mouthWidthFactor: 1.0,
      openHeight: 0,
      visemeId: 0,
    };
  }

  // Smooth syllable rhythm (~3.6 syllables/sec in natural Egyptian Arabic)
  const sylPhase = timeSec * 21.5;
  const sylPulse = 0.5 + 0.5 * Math.sin(sylPhase);
  const vowelShapeCycle = Math.sin(timeSec * 7.3) + 0.5 * Math.cos(timeSec * 11.9);

  // Brief consonant closure ("ب / م") at syllable troughs
  if (sylPulse < 0.14) {
    return {
      jawDrop: 0.8,
      mouthWidthFactor: 0.94,
      openHeight: 1.0,
      visemeId: 1,
    };
  }

  const energy = clamp(voiceAmp * 1.22, 0.15, 1.0) * (0.45 + 0.55 * sylPulse);

  if (vowelShapeCycle > 0.65) {
    // Rounded "أو / و" (e.g. أردوينو / أونو / روبوت)
    return {
      jawDrop: energy * 9.5,
      mouthWidthFactor: 0.68,
      openHeight: 4 + energy * 13,
      visemeId: 5,
    };
  } else if (vowelShapeCycle < -0.55) {
    // Wide "إي / ي / س" showing teeth
    return {
      jawDrop: energy * 5.5,
      mouthWidthFactor: 1.08,
      openHeight: 3 + energy * 8.5,
      visemeId: 2,
    };
  } else if (energy > 0.62) {
    // Tall open "آ / ع"
    return {
      jawDrop: energy * 12.0,
      mouthWidthFactor: 0.96,
      openHeight: 6 + energy * 15.5,
      visemeId: 4,
    };
  }

  // Default conversational Arabic فتحة / سكون
  return {
    jawDrop: energy * 8.0,
    mouthWidthFactor: 0.92,
    openHeight: 3.5 + energy * 11.0,
    visemeId: 3,
  };
}

/**
 * Renders the complete articulated figure of Eng. Amr Ahmed at (anchorX, anchorY).
 */
export function drawRiggedAmrCharacter(
  ctx: CanvasRenderingContext2D,
  opts: RiggedAmrOptions
): void {
  const {
    anchorX,
    anchorY,
    scale,
    timeSec,
    voiceAmplitude,
    mode,
    segmentId,
    pointerTarget,
  } = opts;

  const isTalking = voiceAmplitude > 0.04;
  const viseme = computeSpeechVisemeState(timeSec, voiceAmplitude);

  // Natural breathing (4.2s cycle) + subtle weight shift sway
  const breath = Math.sin((timeSec * Math.PI * 2) / 4.2);
  const bodySwayX = Math.sin(timeSec * 0.9) * 3.5;
  const chestLiftY = breath * -2.8;

  // Gaze & Head Turn:
  // In smartboard_side mode, periodically glance toward pointerTarget on the board,
  // then turn back to make warm eye contact with the student!
  let lookAtBoardFactor = 0;
  if (mode === "smartboard_side" && pointerTarget) {
    // Alternates smoothly: ~42% glancing at board target, ~58% looking at camera
    const glanceWave = Math.sin(timeSec * 1.15);
    lookAtBoardFactor = smoothstep((glanceWave - 0.15) / 0.55);
  } else if (mode === "full_stage") {
    // Occasional glance toward the left-side smartboard
    const stageGlance = Math.sin(timeSec * 0.85);
    lookAtBoardFactor = smoothstep((stageGlance - 0.45) / 0.45) * -0.65;
  }

  const headNod =
    isTalking
      ? Math.sin(timeSec * 5.2) * 0.028 * clamp(voiceAmplitude, 0, 1)
      : Math.sin(timeSec * 1.2) * 0.008;
  const headTilt = Math.sin(timeSec * 0.75) * 0.022 + headNod;
  const headTurnPx = lookAtBoardFactor * 14; // + shifts features right (toward board), - shifts left

  ctx.save();
  ctx.translate(anchorX + bodySwayX * scale, anchorY);
  ctx.scale(scale, scale);

  // Local character space (anchor = hip/lower-torso center at (0, 0), head top ~ -460)
  const shoulderCenterY = -238 + chestLiftY;
  const leftShoulder: Point2D = { x: -86, y: shoulderCenterY + 6 }; // Viewer's left (Amr's right arm!)
  const rightShoulder: Point2D = { x: 86, y: shoulderCenterY + 6 }; // Viewer's right (Amr's left arm!)

  // Determine Left & Right Wrist Targets (in local character coordinates!)
  let viewerLeftWristTarget: Point2D;
  let viewerRightWristTarget: Point2D;
  let viewerLeftHandPose: "wave" | "point" | "pointer_rod" = "wave";
  let viewerRightHandPose: "wave" | "point" | "pointer_rod" | "hold_board" =
    "hold_board";

  // Convert global pointerTarget into local character space if present
  const localPointerTarget: Point2D | null = pointerTarget
    ? {
        x: (pointerTarget.x - (anchorX + bodySwayX * scale)) / scale,
        y: (pointerTarget.y - anchorY) / scale,
      }
    : null;

  const speechBeat = isTalking
    ? Math.sin(timeSec * 5.6) * 14 * clamp(voiceAmplitude, 0.2, 1)
    : Math.sin(timeSec * 1.4) * 3;
  const secondaryBeat = isTalking
    ? Math.cos(timeSec * 4.1) * 10 * clamp(voiceAmplitude, 0.2, 1)
    : 0;

  if (mode === "full_stage") {
    // Viewer's right arm (Amr's left arm) holds up the Arduino UNO R3 naturally at chest height
    viewerRightWristTarget = {
      x: 56 + Math.sin(timeSec * 1.3) * 6,
      y: -115 + chestLiftY + Math.cos(timeSec * 1.7) * 5,
    };
    viewerRightHandPose = "hold_board";

    // Viewer's left arm (Amr's right arm) performs expressive teaching choreography:
    // 0..4.5s of seg-01: Warm Egyptian greeting wave ("السلام عليكم يا شباب")
    if (segmentId === "seg-01" && timeSec < 4.8) {
      const waveOsc = Math.sin(timeSec * 8.5) * 22;
      viewerLeftWristTarget = {
        x: -148 + waveOsc,
        y: -275 + Math.cos(timeSec * 4.2) * 8,
      };
      viewerLeftHandPose = "wave";
    } else {
      // Smooth 4.5-second gesture phrases:
      // Phrase 0: Open-palm friendly explanation toward viewer
      // Phrase 1: Pointing index finger at the Arduino UNO in his other hand
      // Phrase 2: Extending hand toward the Smartboard on viewer's left
      const phraseLen = 4.6;
      const pPos = timeSec / phraseLen;
      const pIdx = Math.floor(pPos) % 3;
      const pFrac = pPos - Math.floor(pPos);
      const blend = smoothstep((pFrac - 0.72) / 0.28);

      const getStageLeftTarget = (idx: number): {
        pt: Point2D;
        pose: "wave" | "point";
      } => {
        if (!isTalking) {
          return { pt: { x: -112, y: -95 }, pose: "wave" };
        }
        if (idx === 0) {
          return {
            pt: {
              x: -142 + secondaryBeat * 0.6,
              y: -165 - Math.abs(speechBeat),
            },
            pose: "wave",
          };
        }
        if (idx === 1) {
          // Pointing across chest right at the Arduino UNO held in his other hand!
          return {
            pt: {
              x: -2 + speechBeat * 0.35,
              y: -128 + secondaryBeat * 0.4,
            },
            pose: "point",
          };
        }
        // Gesture toward the Smartboard on viewer's left
        return {
          pt: {
            x: -185 - Math.abs(secondaryBeat) * 0.7,
            y: -210 + speechBeat * 0.5,
          },
          pose: "point",
        };
      };

      const curG = getStageLeftTarget(pIdx);
      const nxtG = getStageLeftTarget((pIdx + 1) % 3);
      viewerLeftWristTarget = {
        x: lerp(curG.pt.x, nxtG.pt.x, blend),
        y: lerp(curG.pt.y, nxtG.pt.y, blend),
      };
      viewerLeftHandPose = blend > 0.5 ? nxtG.pose : curG.pose;
    }
  } else {
    // SMARTBOARD SIDE MODE (Amr stands on the left `x ~ 195`, Smartboard is on viewer's right `x = 390..1860`!)
    // Viewer's left arm (Amr's outer arm) gestures naturally while talking
    viewerLeftHandPose = "wave";
    viewerLeftWristTarget = isTalking
      ? {
          x: -118 + secondaryBeat * 0.5,
          y: -135 - Math.abs(speechBeat) * 0.85,
        }
      : { x: -102, y: -82 };

    // Viewer's right arm (Amr's inner arm next to the Smartboard!) aims toward pointerTarget!
    if (localPointerTarget) {
      const dirAngle = Math.atan2(
        localPointerTarget.y - rightShoulder.y,
        localPointerTarget.x - rightShoulder.x
      );
      const reachDist = 152;
      viewerRightWristTarget = {
        x:
          rightShoulder.x +
          Math.cos(dirAngle) * reachDist +
          (isTalking ? Math.sin(timeSec * 4.5) * 5 : 0),
        y:
          rightShoulder.y +
          Math.sin(dirAngle) * reachDist +
          (isTalking ? Math.cos(timeSec * 4.5) * 5 : 0),
      };
      viewerRightHandPose = "pointer_rod";
    } else {
      viewerRightWristTarget = {
        x: 128 + secondaryBeat * 0.5,
        y: -150 - Math.abs(speechBeat),
      };
      viewerRightHandPose = "wave";
    }
  }

  // ==================== 1. TORSO & NAVY ENGINEER OVERSHIRT ====================
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 24;

  // Inner charcoal crew-neck T-shirt
  const teeGrad = ctx.createLinearGradient(0, shoulderCenterY, 0, 20);
  teeGrad.addColorStop(0, "#334155");
  teeGrad.addColorStop(1, "#1E293B");
  ctx.fillStyle = teeGrad;
  ctx.beginPath();
  ctx.moveTo(-62, shoulderCenterY - 4);
  ctx.lineTo(62, shoulderCenterY - 4);
  ctx.lineTo(74, 30);
  ctx.lineTo(-74, 30);
  ctx.closePath();
  ctx.fill();

  // Crew-neck collar rib
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, shoulderCenterY - 12, 34, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();

  // Dark Navy Overshirt (Left & Right panels leaving central charcoal tee visible!)
  const shirtGradL = ctx.createLinearGradient(-115, shoulderCenterY, -20, 30);
  shirtGradL.addColorStop(0, "#172554");
  shirtGradL.addColorStop(0.6, "#1E3A8A");
  shirtGradL.addColorStop(1, "#0F172A");

  const shirtGradR = ctx.createLinearGradient(20, shoulderCenterY, 115, 30);
  shirtGradR.addColorStop(0, "#1E3A8A");
  shirtGradR.addColorStop(0.6, "#172554");
  shirtGradR.addColorStop(1, "#0F172A");

  // Left shirt side
  ctx.fillStyle = shirtGradL;
  ctx.beginPath();
  ctx.moveTo(-32, shoulderCenterY - 14);
  ctx.quadraticCurveTo(-82, shoulderCenterY - 8, -104, shoulderCenterY + 20);
  ctx.lineTo(-98, 35);
  ctx.lineTo(-26, 35);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3B82F6";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Right shirt side
  ctx.fillStyle = shirtGradR;
  ctx.beginPath();
  ctx.moveTo(32, shoulderCenterY - 14);
  ctx.quadraticCurveTo(82, shoulderCenterY - 8, 104, shoulderCenterY + 20);
  ctx.lineTo(98, 35);
  ctx.lineTo(26, 35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Utility chest pockets + buttons on navy overshirt
  ctx.strokeStyle = "rgba(148, 163, 184, 0.32)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-82, shoulderCenterY + 48, 42, 46);
  ctx.strokeRect(40, shoulderCenterY + 48, 42, 46);
  ctx.fillStyle = "#94A3B8";
  for (let b = 0; b < 4; b++) {
    ctx.beginPath();
    ctx.arc(-32, shoulderCenterY + 34 + b * 46, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ==================== 2. NECK & SHIRT COLLAR LAPELS ====================
  const neckTopY = shoulderCenterY - 46;
  const neckGrad = ctx.createLinearGradient(-26, neckTopY, 26, shoulderCenterY);
  neckGrad.addColorStop(0, "#B97C57");
  neckGrad.addColorStop(0.5, "#CE916B");
  neckGrad.addColorStop(1, "#9E6443");
  ctx.fillStyle = neckGrad;
  ctx.beginPath();
  ctx.roundRect(-27, neckTopY, 54, 54, 14);
  ctx.fill();

  // Under-chin natural shadow on neck
  ctx.fillStyle = "rgba(15, 23, 42, 0.28)";
  ctx.beginPath();
  ctx.ellipse(0, neckTopY + 12, 28, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crisp navy shirt collar lapels framing the neck
  ctx.fillStyle = "#1E3A8A";
  ctx.strokeStyle = "#60A5FA";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-27, neckTopY + 18);
  ctx.lineTo(-52, shoulderCenterY + 10);
  ctx.lineTo(-28, shoulderCenterY + 26);
  ctx.lineTo(-22, neckTopY + 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(27, neckTopY + 18);
  ctx.lineTo(52, shoulderCenterY + 10);
  ctx.lineTo(28, shoulderCenterY + 26);
  ctx.lineTo(22, neckTopY + 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // ==================== 3. HEAD, HAIR, BEARD, GLASSES, EYES & 6-VISEME MOUTH ====================
  ctx.save();
  ctx.translate(headTurnPx * 0.35, neckTopY - 62);
  ctx.rotate(headTilt);

  const fShift = headTurnPx * 0.65;
  const jawDrop = viseme.jawDrop;

  // Ears
  ctx.fillStyle = "#C2845E";
  ctx.strokeStyle = "#935B3B";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(-66 - fShift * 0.15, 2, 11, 22, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(66 - fShift * 0.15, 2, 11, 22, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Back/Crown Wavy Dark Egyptian Hair
  ctx.fillStyle = "#141418";
  ctx.beginPath();
  ctx.moveTo(-66, -12);
  ctx.bezierCurveTo(-74, -78, -46, -112, 0, -114);
  ctx.bezierCurveTo(48, -112, 74, -78, 66, -12);
  ctx.closePath();
  ctx.fill();

  // Sculpted Head & Dynamic Jaw Contour
  const faceGrad = ctx.createRadialGradient(
    fShift * 0.4 - 12,
    -26,
    12,
    0,
    8,
    92
  );
  faceGrad.addColorStop(0, "#DFAC88");
  faceGrad.addColorStop(0.65, "#CE916B");
  faceGrad.addColorStop(1, "#B37550");

  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.moveTo(-62, -26);
  ctx.bezierCurveTo(-62, -84, 62, -84, 62, -26);
  ctx.bezierCurveTo(63, 24, 52, 58 + jawDrop * 0.7, 26, 76 + jawDrop);
  ctx.quadraticCurveTo(0, 88 + jawDrop, -26, 76 + jawDrop);
  ctx.bezierCurveTo(-52, 58 + jawDrop * 0.7, -63, 24, -62, -26);
  ctx.closePath();
  ctx.fill();

  // Natural Forehead Hairline (clean wavy crop like Eng. Amr's portrait!)
  ctx.fillStyle = "#141418";
  ctx.beginPath();
  ctx.moveTo(-63, -20);
  ctx.quadraticCurveTo(-58, -68, -32, -74);
  ctx.quadraticCurveTo(0, -68, 34, -74);
  ctx.quadraticCurveTo(58, -68, 63, -20);
  ctx.bezierCurveTo(66, -65, 52, -106, 0, -108);
  ctx.bezierCurveTo(-52, -106, -66, -65, -63, -20);
  ctx.closePath();
  ctx.fill();

  // Neatly Groomed Full Short Beard & Jawline (moves cleanly with jawDrop!)
  const beardGrad = ctx.createLinearGradient(0, 14, 0, 88 + jawDrop);
  beardGrad.addColorStop(0, "rgba(24, 24, 29, 0.88)");
  beardGrad.addColorStop(0.5, "#18181D");
  beardGrad.addColorStop(1, "#0E0E12");

  ctx.fillStyle = beardGrad;
  ctx.beginPath();
  // Outer jawline of beard
  ctx.moveTo(-61, -4);
  ctx.bezierCurveTo(-62, 34, -49, 62 + jawDrop * 0.75, -24, 78 + jawDrop);
  ctx.quadraticCurveTo(0, 90 + jawDrop, 24, 78 + jawDrop);
  ctx.bezierCurveTo(49, 62 + jawDrop * 0.75, 62, 34, 61, -4);
  // Inner cheek cutout down to mustache/chin
  ctx.lineTo(54, -4);
  ctx.quadraticCurveTo(48, 28, 33 + fShift * 0.4, 34 + jawDrop * 0.25);
  ctx.quadraticCurveTo(0 + fShift * 0.6, 22, -33 + fShift * 0.4, 34 + jawDrop * 0.25);
  ctx.quadraticCurveTo(-48, 28, -54, -4);
  ctx.closePath();
  ctx.fill();

  // Mustache arch above upper lip
  ctx.fillStyle = "#18181D";
  ctx.beginPath();
  ctx.moveTo(-31 + fShift * 0.65, 31);
  ctx.quadraticCurveTo(fShift * 0.75, 19, 31 + fShift * 0.65, 31);
  ctx.quadraticCurveTo(22 + fShift * 0.65, 37, fShift * 0.75, 34);
  ctx.quadraticCurveTo(-22 + fShift * 0.65, 37, -31 + fShift * 0.65, 31);
  ctx.closePath();
  ctx.fill();

  // Chin skin patch right below lower lip (soul-patch + beard framing)
  ctx.fillStyle = "#C68862";
  ctx.beginPath();
  ctx.ellipse(
    fShift * 0.65,
    46 + jawDrop * 0.85,
    18,
    8,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  // Soul patch
  ctx.fillStyle = "#18181D";
  ctx.beginPath();
  ctx.ellipse(
    fShift * 0.65,
    50 + jawDrop * 0.88,
    6.5,
    5.5,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // ==================== 6-VISEME PHONETIC MOUTH ====================
  const mx = fShift * 0.7;
  const my = 36;
  const mw = 23 * viseme.mouthWidthFactor;
  const mh = viseme.openHeight;

  ctx.save();
  if (viseme.visemeId === 0) {
    // Warm confident closed smile
    ctx.strokeStyle = "#6D372C";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(mx - 21, my - 1);
    ctx.quadraticCurveTo(mx, my + 7, mx + 21, my - 1);
    ctx.stroke();
  } else if (viseme.visemeId === 1) {
    // Bilabial consonant closure (م / ب)
    ctx.strokeStyle = "#5B2B22";
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(mx - 18, my + 1);
    ctx.quadraticCurveTo(mx, my + 2, mx + 18, my + 1);
    ctx.stroke();
  } else {
    // Speaking open visemes (2, 3, 4, 5) with oral cavity, upper teeth & tongue!
    ctx.beginPath();
    if (viseme.visemeId === 5) {
      // Rounded "أو / و" oval
      ctx.ellipse(mx, my + mh * 0.45, mw * 0.78, mh * 0.58, 0, 0, Math.PI * 2);
    } else {
      ctx.moveTo(mx - mw, my - 1);
      ctx.quadraticCurveTo(mx, my + 1.5, mx + mw, my - 1);
      ctx.quadraticCurveTo(mx + mw * 0.75, my + mh + 2, mx, my + mh + 2.5);
      ctx.quadraticCurveTo(mx - mw * 0.75, my + mh + 2, mx - mw, my - 1);
    }
    ctx.closePath();

    // Oral cavity dark fill
    ctx.fillStyle = "#2A0B10";
    ctx.fill();

    // Clip inside mouth for clean teeth & tongue
    ctx.save();
    ctx.clip();

    // Warm tongue hint at bottom of oral cavity
    ctx.fillStyle = "#9F3A47";
    ctx.beginPath();
    ctx.ellipse(mx, my + mh + 1, mw * 0.62, mh * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crisp white upper teeth row
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(mx - mw, my - 3, mw * 2, 6.2);
    ctx.restore();

    // Subtle lip outline
    ctx.strokeStyle = "#7C3F34";
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
  ctx.restore();

  // ==================== NOSE ====================
  ctx.strokeStyle = "#9C6240";
  ctx.lineWidth = 2.1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(fShift * 0.55 + 2, -16);
  ctx.quadraticCurveTo(fShift * 0.85 + 7, 8, fShift * 0.7 + 1, 14);
  ctx.quadraticCurveTo(fShift * 0.65 - 6, 15, fShift * 0.55 - 9, 11);
  ctx.stroke();

  // ==================== EYES, GAZE TRACKING, BLINKING & EYEBROWS ====================
  // Natural blink every ~4.3 seconds (140ms blink duration)
  const blinkCycle = (timeSec + 1.7) % 4.3;
  const blinkClosed =
    blinkCycle < 0.14 ? Math.sin((blinkCycle / 0.14) * Math.PI) : 0;

  const pupilOffsetX = lookAtBoardFactor * 4.2;
  const pupilOffsetY =
    localPointerTarget && lookAtBoardFactor > 0.2
      ? clamp((localPointerTarget.y - (neckTopY - 62)) * 0.008, -2.5, 2.5)
      : 0;

  const browLift = isTalking ? clamp(voiceAmplitude * 4.5, 0, 4.2) : 0;

  const eyeCenters = [
    { x: -24 + fShift * 0.55, y: -15 },
    { x: 24 + fShift * 0.55, y: -15 },
  ];

  for (let i = 0; i < 2; i++) {
    const ec = eyeCenters[i];
    const isLeft = i === 0;

    // Expressive dark eyebrow
    ctx.strokeStyle = "#18181D";
    ctx.lineWidth = 4.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ec.x - 15, ec.y - 13 - browLift * 0.6 + (isLeft ? 2 : -1));
    ctx.quadraticCurveTo(
      ec.x,
      ec.y - 19 - browLift,
      ec.x + 15,
      ec.y - 13 - browLift * 0.6 + (isLeft ? -1 : 2)
    );
    ctx.stroke();

    if (blinkClosed > 0.72) {
      // Closed relaxed eyelid arc
      ctx.strokeStyle = "#5C3420";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(ec.x - 12, ec.y + 1);
      ctx.quadraticCurveTo(ec.x, ec.y + 4, ec.x + 12, ec.y + 1);
      ctx.stroke();
    } else {
      const openScaleY = 1 - blinkClosed * 0.85;
      ctx.save();
      ctx.translate(ec.x, ec.y);
      ctx.scale(1, openScaleY);

      // Sclera
      ctx.fillStyle = "#F8FAFC";
      ctx.beginPath();
      ctx.ellipse(0, 0, 12.5, 7.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Clip inside eye for iris & pupil
      ctx.save();
      ctx.clip();
      ctx.fillStyle = "#3B2314";
      ctx.beginPath();
      ctx.arc(pupilOffsetX, pupilOffsetY, 5.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#09090B";
      ctx.beginPath();
      ctx.arc(pupilOffsetX, pupilOffsetY, 2.9, 0, Math.PI * 2);
      ctx.fill();

      // Studio catchlight sparkle
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(pupilOffsetX - 2, pupilOffsetY - 2, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Upper lash line
      ctx.strokeStyle = "#1E1B18";
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.ellipse(0, -0.5, 12.8, 7.2, 0, Math.PI, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  // ==================== SIGNATURE RIMLESS ENGINEER GLASSES ====================
  const gxL = eyeCenters[0].x;
  const gxR = eyeCenters[1].x;
  const gy = -15;

  ctx.save();
  // Subtle anti-reflective cyan studio glint on lenses
  ctx.fillStyle = "rgba(186, 230, 253, 0.09)";
  ctx.strokeStyle = "rgba(226, 232, 240, 0.72)";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.roundRect(gxL - 18, gy - 11, 36, 22, 5);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(gxR - 18, gy - 11, 36, 22, 5);
  ctx.fill();
  ctx.stroke();

  // Titanium nose bridge & temple hinges
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(gxL + 18, gy - 2);
  ctx.quadraticCurveTo((gxL + gxR) / 2, gy - 6, gxR - 18, gy - 2);
  ctx.moveTo(-62, gy - 2);
  ctx.lineTo(gxL - 18, gy - 2);
  ctx.moveTo(gxR + 18, gy - 2);
  ctx.lineTo(62, gy - 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore(); // End head transform

  // ==================== 4. ARTICULATED 2-BONE IK ARMS, HANDS & SMARTBOARD POINTER ====================
  const upperArmLen = 96;
  const forearmLen = 92;

  // Solve IK for Viewer-Left Arm (bend elbow outward/downward: bendDir = -1)
  const leftIK = solveTwoBoneIK(
    leftShoulder,
    viewerLeftWristTarget,
    upperArmLen,
    forearmLen,
    -1
  );
  // Solve IK for Viewer-Right Arm (bend elbow outward/downward: bendDir = +1)
  const rightIK = solveTwoBoneIK(
    rightShoulder,
    viewerRightWristTarget,
    upperArmLen,
    forearmLen,
    1
  );

  // Draw Viewer-Left Arm (Navy upper sleeve -> rolled cuff -> skin forearm -> expressive hand)
  drawTaperedLimb(
    ctx,
    leftShoulder,
    leftIK.elbow,
    21,
    16,
    "#1E3A8A",
    "#0F172A"
  );
  drawTaperedLimb(
    ctx,
    leftIK.elbow,
    leftIK.wrist,
    14.5,
    10.5,
    "#CE916B",
    "#9A6242"
  );
  // Rolled navy sleeve cuff at elbow
  drawTaperedLimb(
    ctx,
    leftIK.elbow,
    {
      x: lerp(leftIK.elbow.x, leftIK.wrist.x, 0.22),
      y: lerp(leftIK.elbow.y, leftIK.wrist.y, 0.22),
    },
    17.5,
    16.5,
    "#172554",
    "#3B82F6"
  );

  const leftForeAngle = Math.atan2(
    leftIK.wrist.y - leftIK.elbow.y,
    leftIK.wrist.x - leftIK.elbow.x
  );
  drawExpressiveHand(
    ctx,
    leftIK.wrist,
    leftForeAngle,
    viewerLeftHandPose,
    timeSec,
    1
  );

  // Draw Viewer-Right Arm
  drawTaperedLimb(
    ctx,
    rightShoulder,
    rightIK.elbow,
    21,
    16,
    "#172554",
    "#0F172A"
  );
  drawTaperedLimb(
    ctx,
    rightIK.elbow,
    rightIK.wrist,
    14.5,
    10.5,
    "#CE916B",
    "#9A6242"
  );
  // Rolled navy sleeve cuff
  drawTaperedLimb(
    ctx,
    rightIK.elbow,
    {
      x: lerp(rightIK.elbow.x, rightIK.wrist.x, 0.22),
      y: lerp(rightIK.elbow.y, rightIK.wrist.y, 0.22),
    },
    17.5,
    16.5,
    "#1E3A8A",
    "#3B82F6"
  );

  const rightForeAngle = Math.atan2(
    rightIK.wrist.y - rightIK.elbow.y,
    rightIK.wrist.x - rightIK.elbow.x
  );

  // If holding telescopic smartboard pointer, draw the sleek metallic rod extending toward pointerTarget!
  if (viewerRightHandPose === "pointer_rod" && localPointerTarget) {
    const handTip = drawExpressiveHand(
      ctx,
      rightIK.wrist,
      rightForeAngle,
      "pointer_rod",
      timeSec,
      -1
    );

    const dxT = localPointerTarget.x - handTip.x;
    const dyT = localPointerTarget.y - handTip.y;
    const distToTarget = Math.hypot(dxT, dyT) || 1;
    const rodMaxLen = Math.min(distToTarget, 240);
    const rodEndX = handTip.x + (dxT / distToTarget) * rodMaxLen;
    const rodEndY = handTip.y + (dyT / distToTarget) * rodMaxLen;

    // Metallic telescopic wand
    ctx.save();
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(handTip.x - (dxT / distToTarget) * 14, handTip.y - (dyT / distToTarget) * 14);
    ctx.lineTo(rodEndX, rodEndY);
    ctx.stroke();

    // Subtle laser guide beam from wand tip right to exact smartboard component!
    if (distToTarget > rodMaxLen + 8) {
      const beamGrad = ctx.createLinearGradient(
        rodEndX,
        rodEndY,
        localPointerTarget.x,
        localPointerTarget.y
      );
      beamGrad.addColorStop(0, "rgba(34, 211, 238, 0.85)");
      beamGrad.addColorStop(1, "rgba(250, 204, 21, 0.92)");
      ctx.strokeStyle = beamGrad;
      ctx.lineWidth = 2.6;
      ctx.setLineDash([10, 7]);
      ctx.lineDashOffset = -timeSec * 48;
      ctx.beginPath();
      ctx.moveTo(rodEndX, rodEndY);
      ctx.lineTo(localPointerTarget.x, localPointerTarget.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Glowing wand tip + pulsing highlight ring on the smartboard target
    ctx.fillStyle = "#22D3EE";
    ctx.shadowColor = "#22D3EE";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(rodEndX, rodEndY, 5.5, 0, Math.PI * 2);
    ctx.fill();

    const pulseR = 12 + 4 * Math.sin(timeSec * 6.5);
    ctx.strokeStyle = "#FACC15";
    ctx.shadowColor = "#FACC15";
    ctx.shadowBlur = 16;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(localPointerTarget.x, localPointerTarget.y, pulseR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else {
    drawExpressiveHand(
      ctx,
      rightIK.wrist,
      rightForeAngle,
      viewerRightHandPose,
      timeSec,
      -1
    );
  }

  ctx.restore();
}

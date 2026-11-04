import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import {
  SHARED_LESSON_SEGMENTS,
  SHARED_TOTAL_DURATION_SEC,
} from "./src/shared/lessonScript.ts";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const TTS_CACHE_DIR = "/tmp/amr_tts_clean_v3";
const VIDEO_CACHE_DIR = "/tmp/amr_video_clean_v3";
fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });
fs.mkdirSync(VIDEO_CACHE_DIR, { recursive: true });

interface CachedClip {
  audioBase64: string;
  mimeType: string;
}

interface ExportFramePayload {
  id: string;
  jpegBase64: string;
}

interface ExportTimelineItem {
  frameId: string;
  durationSec: number;
}

interface MasterAudioMeta {
  voiceName: string;
  voiceSegmentsIncluded: number;
  envelope10Hz: number[];
}

const audioCache = new Map<string, CachedClip>();
const inflightRequests = new Map<string, Promise<CachedClip>>();

let currentExportState: {
  active: boolean;
  stage: string;
  percent: number;
} = {
  active: false,
  stage: "idle",
  percent: 0,
};

// Hydrate RAM cache from /tmp/amr_tts_cache on startup
try {
  for (const file of fs.readdirSync(TTS_CACHE_DIR)) {
    if (file.endsWith(".json")) {
      const key = file.slice(0, -5);
      const parsed = JSON.parse(
        fs.readFileSync(path.join(TTS_CACHE_DIR, file), "utf-8")
      ) as CachedClip;
      if (parsed?.audioBase64) {
        audioCache.set(key, parsed);
      }
    }
  }
} catch {
  // Ignore cache hydration issues
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesizeSegmentAudio(
  segmentId: string,
  text: string,
  voiceName = "Charon"
): Promise<CachedClip> {
  const safeVoice = voiceName.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeId = segmentId.replace(/[^a-zA-Z0-9_-]/g, "");
  const cacheKey = `${safeVoice}_${safeId}`;

  const existing = audioCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const inflight = inflightRequests.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const task = (async (): Promise<CachedClip> => {
    const ai = getAiClient();
    const modelsToTry = ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts"];
    let lastError: unknown = null;

    for (const modelName of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const cleanTranscript = text.trim();
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: cleanTranscript,
                    speechMetadata: {
                      style:
                        "Warm, confident, friendly Egyptian electronics and robotics engineer speaking natural Egyptian colloquial Arabic (Masri) clearly to beginners, pronouncing English technical terms like Arduino UNO, Microcontroller, Digital, Analog, setup, loop, and LED naturally",
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: safeVoice || "Charon",
                  },
                },
              },
            },
          });

          const parts = response.candidates?.[0]?.content?.parts ?? [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              const clip: CachedClip = {
                audioBase64: part.inlineData.data,
                mimeType: part.inlineData.mimeType || "audio/wav",
              };
              audioCache.set(cacheKey, clip);
              try {
                fs.writeFileSync(
                  path.join(TTS_CACHE_DIR, `${cacheKey}.json`),
                  JSON.stringify(clip)
                );
              } catch {
                // Ignore disk write failure
              }
              return clip;
            }
          }
          throw new Error("NO_AUDIO_DATA_RETURNED");
        } catch (err) {
          lastError = err;
          await sleep(750 * (attempt + 1));
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("TTS_GENERATION_FAILED");
  })();

  inflightRequests.set(cacheKey, task);
  try {
    return await task;
  } finally {
    inflightRequests.delete(cacheKey);
  }
}

let backgroundWarmRunning = false;
async function warmAllSegmentsInBackground(voiceName = "Charon"): Promise<void> {
  if (backgroundWarmRunning || !process.env.GEMINI_API_KEY) return;
  backgroundWarmRunning = true;
  try {
    for (let pass = 0; pass < 3; pass++) {
      const missing = SHARED_LESSON_SEGMENTS.filter(
        (s) => !audioCache.has(`${voiceName}_${s.id}`)
      );
      if (missing.length === 0) break;

      const queue = [...missing];
      const concurrency = 2;
      const workers = Array.from({ length: concurrency }, async () => {
        while (queue.length > 0) {
          const seg = queue.shift();
          if (!seg) break;
          if (audioCache.has(`${voiceName}_${seg.id}`)) continue;
          try {
            await synthesizeSegmentAudio(seg.id, seg.narrationAr, voiceName);
            await sleep(850);
          } catch {
            await sleep(2200);
          }
        }
      });
      await Promise.all(workers);
      await sleep(1500);
    }
  } finally {
    backgroundWarmRunning = false;
  }
}

function parseWavToMono24k(wavBuf: Buffer): Int16Array {
  let dataOffset = 44;
  let dataLength = Math.max(0, wavBuf.length - 44);
  let sampleRate = 24000;
  let numChannels = 1;

  if (
    wavBuf.length >= 44 &&
    wavBuf.toString("ascii", 0, 4) === "RIFF" &&
    wavBuf.toString("ascii", 8, 12) === "WAVE"
  ) {
    let pos = 12;
    while (pos + 8 <= wavBuf.length) {
      const chunkId = wavBuf.toString("ascii", pos, pos + 4);
      const chunkSize = wavBuf.readUInt32LE(pos + 4);
      if (chunkId === "fmt " && pos + 16 <= wavBuf.length) {
        numChannels = wavBuf.readUInt16LE(pos + 10);
        sampleRate = wavBuf.readUInt32LE(pos + 12);
      } else if (chunkId === "data") {
        dataOffset = pos + 8;
        dataLength = Math.min(chunkSize, wavBuf.length - dataOffset);
        break;
      }
      pos += 8 + chunkSize + (chunkSize % 2);
    }
  }

  const totalFrames = Math.floor(dataLength / (2 * Math.max(1, numChannels)));
  const rawMono = new Int16Array(totalFrames);
  for (let i = 0; i < totalFrames; i++) {
    rawMono[i] = wavBuf.readInt16LE(dataOffset + i * 2 * numChannels);
  }

  let pcm24k = rawMono;
  if (sampleRate !== 24000 && sampleRate > 0 && rawMono.length > 1) {
    const outLen = Math.floor((rawMono.length * 24000) / sampleRate);
    pcm24k = new Int16Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const srcPos = (i * sampleRate) / 24000;
      const idx = Math.min(rawMono.length - 1, Math.floor(srcPos));
      pcm24k[i] = rawMono[idx];
    }
  }

  let endIdx = pcm24k.length;
  while (endIdx > 2400 && Math.abs(pcm24k[endIdx - 1]) < 90) {
    endIdx--;
  }
  endIdx = Math.min(pcm24k.length, endIdx + 2400);
  return pcm24k.subarray(0, endIdx);
}

function writeWavFile24kMono(filePath: string, samples: Int16Array): void {
  const sampleRate = 24000;
  const dataByteLen = samples.length * 2;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataByteLen, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataByteLen, 40);

  const pcmBuf = Buffer.from(
    samples.buffer,
    samples.byteOffset,
    samples.byteLength
  );
  fs.writeFileSync(filePath, Buffer.concat([header, pcmBuf]));
}

let inflightAudioPrep: Promise<{
  m4aPath: string;
  aacPath: string;
  meta: MasterAudioMeta;
}> | null = null;

/**
 * Builds and caches:
 * 1. master_audio_<voice>.aac (~9.8 MB raw ADTS 44.1kHz stereo AAC-LC for instant client-side muxing!)
 * 2. master_audio_<voice>.m4a (for server-side fallback if needed)
 * 3. master_meta_<voice>.json (6,000-element 10Hz real voice RMS envelope for natural jaw lip-sync!)
 */
async function ensureMasterAudioAndEnvelope(
  voiceName = "Charon"
): Promise<{ m4aPath: string; aacPath: string; meta: MasterAudioMeta }> {
  if (inflightAudioPrep) {
    return inflightAudioPrep;
  }

  inflightAudioPrep = (async () => {
    const safeVoice = voiceName.replace(/[^a-zA-Z0-9_-]/g, "") || "Charon";
    const m4aPath = path.join(VIDEO_CACHE_DIR, `master_audio_${safeVoice}.m4a`);
    const aacPath = path.join(VIDEO_CACHE_DIR, `master_audio_${safeVoice}.aac`);
    const metaPath = path.join(VIDEO_CACHE_DIR, `master_meta_${safeVoice}.json`);

    // Try synthesizing any missing TTS segments politely
    const missing = SHARED_LESSON_SEGMENTS.filter(
      (s) => !audioCache.has(`${safeVoice}_${s.id}`)
    );

    if (missing.length > 0) {
      let done = SHARED_LESSON_SEGMENTS.length - missing.length;
      const queue = [...missing];
      const workers = Array.from({ length: 2 }, async () => {
        while (queue.length > 0) {
          const seg = queue.shift();
          if (!seg) break;
          currentExportState = {
            active: true,
            stage: `توليد الصوت المصري للمهندس عمرو أحمد (${done}/${SHARED_LESSON_SEGMENTS.length})...`,
            percent: Math.min(
              22,
              4 + Math.round((done / SHARED_LESSON_SEGMENTS.length) * 18)
            ),
          };
          try {
            await synthesizeSegmentAudio(seg.id, seg.narrationAr, safeVoice);
          } catch {
            // Continue resiliently
          }
          done++;
        }
      });
      await Promise.all(workers);
    }

    const availableVoiceCount = SHARED_LESSON_SEGMENTS.filter((s) =>
      audioCache.has(`${safeVoice}_${s.id}`)
    ).length;

    // Fast reuse if cached m4a + meta already match availableVoiceCount
    if (fs.existsSync(m4aPath) && fs.existsSync(metaPath)) {
      try {
        const cachedMeta = JSON.parse(
          fs.readFileSync(metaPath, "utf-8")
        ) as MasterAudioMeta;
        const m4aStat = fs.statSync(m4aPath);
        if (
          m4aStat.size > 200_000 &&
          cachedMeta.envelope10Hz?.length === SHARED_TOTAL_DURATION_SEC * 10 &&
          cachedMeta.voiceSegmentsIncluded >= availableVoiceCount
        ) {
          // Ensure raw ADTS .aac exists alongside .m4a (takes 0.08s stream copy!)
          if (!fs.existsSync(aacPath) || fs.statSync(aacPath).size < 200_000) {
            await execFileAsync("ffmpeg", [
              "-y",
              "-v",
              "error",
              "-i",
              m4aPath,
              "-c:a",
              "copy",
              "-f",
              "adts",
              aacPath,
            ]);
          }
          return { m4aPath, aacPath, meta: cachedMeta };
        }
      } catch {
        // Rebuild below
      }
    }

    currentExportState = {
      active: true,
      stage: "دمج المقاطع الصوتية والموسيقى الهادئة لـ 10 دقائق كاملة...",
      percent: 23,
    };

    const SAMPLE_RATE = 24000;
    const totalSamples = SHARED_TOTAL_DURATION_SEC * SAMPLE_RATE;
    const voiceOnlyFloat = new Float32Array(totalSamples);
    const mixFloat = new Float32Array(totalSamples);
    const voiceMask = new Uint8Array(totalSamples);

    let cursorSample = 0;
    let voiceSegmentsIncluded = 0;
    const missingSegmentRanges: { startSec: number; endSec: number }[] = [];

    for (const seg of SHARED_LESSON_SEGMENTS) {
      const clip = audioCache.get(`${safeVoice}_${seg.id}`);
      if (!clip) {
        missingSegmentRanges.push({ startSec: seg.startSec, endSec: seg.endSec });
        continue;
      }

      voiceSegmentsIncluded++;
      const pcm = parseWavToMono24k(Buffer.from(clip.audioBase64, "base64"));
      const canonicalStart = Math.floor(seg.startSec * SAMPLE_RATE);
      const startSample = Math.max(canonicalStart, cursorSample);

      const maxAvail = totalSamples - startSample;
      const copyLen = Math.min(pcm.length, Math.max(0, maxAvail));

      for (let i = 0; i < copyLen; i++) {
        const v = pcm[i] / 32768.0;
        voiceOnlyFloat[startSample + i] = v;
        mixFloat[startSample + i] += v;
        voiceMask[startSample + i] = 1;
      }

      cursorSample = startSample + copyLen + Math.floor(0.22 * SAMPLE_RATE);
    }

    const totalFrames10Hz = SHARED_TOTAL_DURATION_SEC * 10;
    const samplesPerFrame = SAMPLE_RATE / 10;
    const envelope10Hz = new Array<number>(totalFrames10Hz).fill(0);

    for (let f = 0; f < totalFrames10Hz; f++) {
      const base = f * samplesPerFrame;
      let sumSq = 0;
      for (let i = 0; i < samplesPerFrame; i++) {
        const v = voiceOnlyFloat[base + i];
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / samplesPerFrame);
      envelope10Hz[f] = Math.min(100, Math.round(rms * 420));
    }

    for (const rng of missingSegmentRanges) {
      const fStart = Math.floor(rng.startSec * 10);
      const fEnd = Math.min(
        totalFrames10Hz,
        Math.floor(Math.max(rng.startSec + 1, rng.endSec - 1.2) * 10)
      );
      for (let f = fStart; f < fEnd; f++) {
        const t = f / 10;
        const pauseGate = Math.sin(t * 1.9) > -0.65 ? 1 : 0;
        envelope10Hz[f] = pauseGate
          ? Math.round(42 + 32 * Math.abs(Math.sin(t * 6.4)))
          : 0;
      }
    }

    const chords = [
      [130.81, 196.0, 246.94, 293.66],
      [110.0, 164.81, 220.0, 261.63],
      [146.83, 220.0, 261.63, 329.63],
      [98.0, 146.83, 196.0, 246.94],
    ];
    const twoPiOverSr = (2 * Math.PI) / SAMPLE_RATE;
    let smoothedDuck = 0.085;

    for (let s = 0; s < totalSamples; s++) {
      const targetAmp = voiceMask[s] ? 0.025 : 0.072;
      smoothedDuck += (targetAmp - smoothedDuck) * 0.0008;

      const chordIdx = Math.floor(s / (SAMPLE_RATE * 6)) % chords.length;
      const chord = chords[chordIdx];
      const padSample =
        0.4 * Math.sin(s * chord[0] * twoPiOverSr) +
        0.25 * Math.sin(s * chord[1] * twoPiOverSr) +
        0.2 * Math.sin(s * chord[2] * twoPiOverSr) +
        0.15 * Math.sin(s * chord[3] * twoPiOverSr);

      mixFloat[s] += padSample * smoothedDuck;
    }

    const finalInt16 = new Int16Array(totalSamples);
    for (let s = 0; s < totalSamples; s++) {
      const v = Math.max(-0.98, Math.min(0.98, mixFloat[s]));
      finalInt16[s] = Math.round(v * 32767);
    }

    const tempWavPath = path.join(
      VIDEO_CACHE_DIR,
      `master_audio_${safeVoice}_${Date.now()}.wav`
    );
    try {
      writeWavFile24kMono(tempWavPath, finalInt16);
      await execFileAsync("ffmpeg", [
        "-y",
        "-v",
        "error",
        "-i",
        tempWavPath,
        "-ar",
        "44100",
        "-ac",
        "2",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        m4aPath,
      ]);
      await execFileAsync("ffmpeg", [
        "-y",
        "-v",
        "error",
        "-i",
        m4aPath,
        "-c:a",
        "copy",
        "-f",
        "adts",
        aacPath,
      ]);
    } finally {
      fs.rmSync(tempWavPath, { force: true });
    }

    const meta: MasterAudioMeta = {
      voiceName: safeVoice,
      voiceSegmentsIncluded,
      envelope10Hz,
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta));
    return { m4aPath, aacPath, meta };
  })();

  try {
    return await inflightAudioPrep;
  } finally {
    inflightAudioPrep = null;
  }
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: "30mb" }));

  app.get("/api/tts/status", (req, res) => {
    const voice =
      typeof req.query.voice === "string"
        ? req.query.voice.replace(/[^a-zA-Z0-9_-]/g, "")
        : "Charon";
    const cachedIds: string[] = [];
    for (const key of audioCache.keys()) {
      if (key.startsWith(`${voice}_`)) {
        cachedIds.push(key.slice(voice.length + 1));
      }
    }

    res.json({
      cachedIds,
      totalSegments: SHARED_LESSON_SEGMENTS.length,
      exportProgress: currentExportState,
    });
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const { segmentId, text, voiceName = "Charon" } = req.body as {
        segmentId?: string;
        text?: string;
        voiceName?: string;
      };

      if (!segmentId || !text || typeof text !== "string") {
        res
          .status(400)
          .json({ error: "النص ومعرف المقطع مطلوبان لتوليد الصوت." });
        return;
      }

      const clip = await synthesizeSegmentAudio(segmentId, text, voiceName);
      res.json(clip);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status =
        message.includes("429") || message.includes("RESOURCE_EXHAUSTED")
          ? 429
          : message.includes("403") ||
              message.includes("PERMISSION_DENIED") ||
              message.includes("API_KEY")
            ? 403
            : 500;

      res.status(status).json({
        error:
          status === 403
            ? "يرجى التأكد من إعداد مفتاح Gemini API في لوحة Settings > Secrets."
            : status === 429
              ? "تم الوصول للحد المؤقت لطلبات الصوت، انتظر لحظات أو استخدم مفتاح مدفوع في Settings > Secrets."
              : `تعذر توليد المقطع الصوتي حالياً (${message})`,
      });
    }
  });

  /**
   * Prepares the 10-minute Egyptian Arabic master audio (.aac) + returns the 6,000-frame
   * 10Hz voice amplitude envelope so the client muxes video + audio 100% locally in RAM!
   */
  app.post("/api/video/prepare-audio", async (req, res) => {
    try {
      const { voiceName = "Charon" } = (req.body ?? {}) as {
        voiceName?: string;
      };
      currentExportState = {
        active: true,
        stage: "تجهيز الصوت المصري الكامل للمهندس عمرو أحمد...",
        percent: 5,
      };
      const { meta } = await ensureMasterAudioAndEnvelope(voiceName);
      currentExportState = {
        active: false,
        stage: "idle",
        percent: 25,
      };
      res.json({
        envelope10Hz: meta.envelope10Hz,
        voiceSegmentsIncluded: meta.voiceSegmentsIncluded,
        totalSegments: SHARED_LESSON_SEGMENTS.length,
      });
    } catch (err: unknown) {
      currentExportState = { active: false, stage: "error", percent: 0 };
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        error: `تعذر تجهيز المسار الصوتي للدرس (${msg})`,
      });
    }
  });

  /**
   * Streams the ~9.8 MB raw ADTS AAC 44.1kHz stereo audio track to the browser
   * (well under Cloud Run's 32 MB limit!) so mp4-muxer muxes audio + video locally in 80ms!
   */
  app.get("/api/video/master-audio.aac", async (req, res) => {
    try {
      const voice =
        typeof req.query.voice === "string"
          ? req.query.voice.replace(/[^a-zA-Z0-9_-]/g, "")
          : "Charon";
      const { aacPath } = await ensureMasterAudioAndEnvelope(voice);
      const stat = fs.statSync(aacPath);
      res.setHeader("Content-Type", "audio/aac");
      res.setHeader("Content-Length", String(stat.size));
      res.setHeader("Cache-Control", "no-store");
      fs.createReadStream(aacPath).pipe(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `تعذر تحميل المسار الصوتي (${msg})` });
    }
  });

  /**
   * Compact Server-Side FFmpeg Fallback (< 24 MB output, only used if browser lacks WebCodecs):
   */
  app.post("/api/video/export-mp4", async (req, res) => {
    const jobDir = fs.mkdtempSync("/tmp/amr_fallback_mp4_");
    try {
      const {
        resolution = "720p",
        frames = [],
        timeline = [],
        voiceName = "Charon",
      } = req.body as {
        resolution?: "720p" | "1080p";
        frames?: ExportFramePayload[];
        timeline?: ExportTimelineItem[];
        voiceName?: string;
      };

      if (!frames.length || !timeline.length) {
        res.status(400).json({ error: "لم يتم إرسال مشاهد الفيديو للتجميع." });
        return;
      }

      const framePathMap = new Map<string, string>();
      for (const f of frames) {
        const safeId = f.id.replace(/[^a-zA-Z0-9_-]/g, "");
        const fp = path.join(jobDir, `${safeId}.jpg`);
        const cleanB64 = f.jpegBase64.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(fp, Buffer.from(cleanB64, "base64"));
        framePathMap.set(f.id, fp);
      }

      const concatLines: string[] = [];
      let lastFramePath = "";
      for (const item of timeline) {
        const fp = framePathMap.get(item.frameId);
        if (!fp) continue;
        concatLines.push(`file '${fp}'`);
        concatLines.push(`duration ${item.durationSec.toFixed(3)}`);
        lastFramePath = fp;
      }
      if (lastFramePath) {
        concatLines.push(`file '${lastFramePath}'`);
      }

      const concatPath = path.join(jobDir, "concat.txt");
      fs.writeFileSync(concatPath, concatLines.join("\n"));

      const { m4aPath } = await ensureMasterAudioAndEnvelope(voiceName);
      const tag = resolution === "1080p" ? "1080P" : "720P";
      const fileName = `Arduino_UNO_Amr_Ahmed_COMPLETE_${tag}.mp4`;
      const outPath = path.join(jobDir, fileName);

      await execFileAsync("ffmpeg", [
        "-y",
        "-v",
        "error",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatPath,
        "-i",
        m4aPath,
        "-vsync",
        "vfr",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "25",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "copy",
        "-shortest",
        "-movflags",
        "+faststart",
        outPath,
      ]);

      const stat = fs.statSync(outPath);
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Content-Length", String(stat.size));
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      fs.createReadStream(outPath).pipe(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `تعذر تجميع ملف الـ MP4 (${msg})` });
    } finally {
      res.on("finish", () => {
        fs.rmSync(jobDir, { recursive: true, force: true });
      });
      currentExportState = { active: false, stage: "idle", percent: 0 };
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Amr Ahmed Studio Server listening on http://0.0.0.0:${PORT}`);
    setTimeout(() => {
      void warmAllSegmentsInBackground("Charon");
    }, 800);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

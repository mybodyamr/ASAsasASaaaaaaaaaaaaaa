import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Subtitles,
  Maximize2,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Music,
  Loader2,
  AlertCircle,
  Film,
} from "lucide-react";
import {
  FIVE_PROJECTS_DATA,
  LED_PROJECT_CODE,
  LESSON_CHAPTERS,
  LESSON_METADATA,
  LESSON_SEGMENTS,
  RAW_INO_SKETCH,
  TOTAL_DURATION_SEC,
  formatSecondsMMSS,
  getChapterAtTime,
  getSegmentAtTime,
} from "./data/lessonData";
import { StudioAudioEngine } from "./engine/audioEngine";
import {
  LoadedStudioImages,
  getTimelineChapterTicks,
  preloadStudioImages,
  renderStudioFrame,
} from "./engine/canvasRenderer";
import {
  downloadArduinoSketchFile,
  exportLessonPresentationPptx,
} from "./utils/exportPptx";
import {
  DownloadedMp4Result,
  Mp4BuildProgress,
  downloadInstantLessonMp4,
} from "./utils/instantMp4Exporter";
import { InteractiveLedLab } from "./components/InteractiveLedLab";

type VideoResolution = "720p" | "1080p";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const audioEngineRef = useRef<StudioAudioEngine | null>(null);

  const [studioImages, setStudioImages] = useState<LoadedStudioImages>({
    amrPresenter: null,
    amrPresenterOpen: null,
    amrPresenterPoint: null,
    amrAvatar: null,
    amrAvatarOpen: null,
    amrAvatarGesture: null,
    labBackdrop: null,
    smartCar: null,
    roboticsArm: null,
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [voiceMuted, setVoiceMuted] = useState<boolean>(false);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true);
  const [musicVolume, setMusicVolume] = useState<number>(0.14);
  const [resolution, setResolution] = useState<VideoResolution>("720p");

  const [isBufferingVoice, setIsBufferingVoice] = useState<boolean>(false);
  const [ttsWarning, setTtsWarning] = useState<string | null>(null);
  const [silentFallbackMode, setSilentFallbackMode] = useState<boolean>(false);

  // Full-Motion Complete MP4 Download state (Verified Blob, zero real-time wait!)
  const [isDownloadingMp4, setIsDownloadingMp4] = useState<boolean>(false);
  const [mp4Progress, setMp4Progress] = useState<Mp4BuildProgress | null>(null);
  const [mp4Error, setMp4Error] = useState<string | null>(null);
  const [readyMp4, setReadyMp4] = useState<DownloadedMp4Result | null>(null);
  const [serverVoiceReadyCount, setServerVoiceReadyCount] = useState<number>(0);

  // PPTX & Code Copy feedback
  const [isExportingPptx, setIsExportingPptx] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Mutable refs for 60fps animation loop accuracy
  const timeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const isBufferingRef = useRef<boolean>(false);
  const activeVoiceSegRef = useRef<string | null>(null);
  const segmentRateRef = useRef<number>(1.0);
  const silentFallbackRef = useRef<boolean>(false);

  useEffect(() => {
    silentFallbackRef.current = silentFallbackMode;
  }, [silentFallbackMode]);

  // Initialize Studio Images, Audio Engine & Poll Background Voice Cache Readiness
  useEffect(() => {
    let mounted = true;
    preloadStudioImages().then((imgs) => {
      if (mounted) {
        setStudioImages(imgs);
      }
    });

    const engine = new StudioAudioEngine();
    audioEngineRef.current = engine;

    const pollServerStatus = () => {
      fetch("/api/tts/status")
        .then((r) => (r.ok ? r.json() : null))
        .then(
          (
            data: {
              cachedIds?: string[];
              totalSegments?: number;
            } | null
          ) => {
            if (mounted && data?.cachedIds) {
              setServerVoiceReadyCount(data.cachedIds.length);
            }
          }
        )
        .catch(() => {
          // Ignore status poll warning
        });
    };

    pollServerStatus();
    const statusInterval = window.setInterval(pollServerStatus, 3500);

    return () => {
      mounted = false;
      clearInterval(statusInterval);
      engine.destroy();
    };
  }, []);

  const prefetchUpcomingSegments = useCallback((fromTimeSec: number) => {
    const engine = audioEngineRef.current;
    if (!engine || silentFallbackRef.current) return;

    const currentIdx = LESSON_SEGMENTS.findIndex(
      (s) => fromTimeSec >= s.startSec && fromTimeSec < s.endSec
    );
    if (currentIdx === -1) return;

    for (let offset = 1; offset <= 2; offset++) {
      const nextSeg = LESSON_SEGMENTS[currentIdx + offset];
      if (nextSeg && !engine.hasDecodedSegment(nextSeg.id)) {
        engine
          .fetchAndDecodeSegment(nextSeg.id, nextSeg.narrationAr)
          .catch(() => {
            // Ignore background prefetch errors
          });
      }
    }
  }, []);

  const syncSegmentVoiceAtTime = useCallback(
    async (sec: number) => {
      const engine = audioEngineRef.current;
      if (!engine || !isPlayingRef.current) return;

      const seg = getSegmentAtTime(sec);
      if (activeVoiceSegRef.current === seg.id) {
        return;
      }

      activeVoiceSegRef.current = seg.id;
      const offsetIntoSlot = Math.max(0, sec - seg.startSec);
      const slotDuration = seg.endSec - seg.startSec;

      if (silentFallbackRef.current) {
        segmentRateRef.current = 1.0;
        return;
      }

      setIsBufferingVoice(true);
      isBufferingRef.current = true;

      try {
        const buffer = await engine.fetchAndDecodeSegment(
          seg.id,
          seg.narrationAr
        );
        setTtsWarning(null);

        if (!isPlayingRef.current || activeVoiceSegRef.current !== seg.id) {
          setIsBufferingVoice(false);
          isBufferingRef.current = false;
          return;
        }

        if (buffer) {
          const remainingSlot = Math.max(1, slotDuration - offsetIntoSlot);
          const audioOffset =
            offsetIntoSlot > 0.35
              ? Math.min(buffer.duration - 0.1, offsetIntoSlot)
              : 0;
          const remainingAudio = Math.max(0.2, buffer.duration - audioOffset);

          segmentRateRef.current =
            remainingAudio > remainingSlot - 0.35
              ? remainingSlot / (remainingAudio + 0.45)
              : 1.0;

          engine.playSegmentBuffer(seg.id, buffer, audioOffset);
        } else {
          segmentRateRef.current = 1.0;
        }

        prefetchUpcomingSegments(sec);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setTtsWarning(
          `تعذر تحميل الصوت اللحظي (${msg}) — يستمر العرض البصري والترجمة تلقائياً.`
        );
        segmentRateRef.current = 1.0;
      } finally {
        setIsBufferingVoice(false);
        isBufferingRef.current = false;
      }
    },
    [prefetchUpcomingSegments]
  );

  const pausePlayback = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    isBufferingRef.current = false;
    setIsBufferingVoice(false);
    activeVoiceSegRef.current = null;
    audioEngineRef.current?.stopVoice();
    audioEngineRef.current?.stopAmbientMusic();
  }, []);

  const startPlaybackAt = useCallback(
    (startSec: number) => {
      const clamped = Math.max(0, Math.min(TOTAL_DURATION_SEC - 0.05, startSec));
      timeRef.current = clamped;
      setCurrentTimeSec(clamped);

      const engine = audioEngineRef.current;
      if (engine) {
        engine.ensureContext();
        engine.setVoiceMuted(voiceMuted);
        engine.setMusicEnabled(musicEnabled);
        engine.setMusicVolume(musicVolume);
        if (musicEnabled) {
          engine.startAmbientMusic();
        }
      }

      activeVoiceSegRef.current = null;
      isPlayingRef.current = true;
      setIsPlaying(true);
      void syncSegmentVoiceAtTime(clamped);
    },
    [musicEnabled, musicVolume, syncSegmentVoiceAtTime, voiceMuted]
  );

  const togglePlayPause = useCallback(() => {
    if (isPlayingRef.current) {
      pausePlayback();
    } else {
      const restartFrom =
        timeRef.current >= TOTAL_DURATION_SEC - 0.2 ? 0 : timeRef.current;
      startPlaybackAt(restartFrom);
    }
  }, [pausePlayback, startPlaybackAt]);

  const seekTo = useCallback(
    (targetSec: number) => {
      const clamped = Math.max(0, Math.min(TOTAL_DURATION_SEC, targetSec));
      timeRef.current = clamped;
      setCurrentTimeSec(clamped);
      activeVoiceSegRef.current = null;
      audioEngineRef.current?.stopVoice();

      if (isPlayingRef.current && clamped < TOTAL_DURATION_SEC - 0.05) {
        void syncSegmentVoiceAtTime(clamped);
      }
    },
    [syncSegmentVoiceAtTime]
  );

  // Master 60fps Render & Timeline Loop
  useEffect(() => {
    let rafId = 0;
    let lastTimestamp = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - lastTimestamp) / 1000));
      lastTimestamp = now;

      if (isPlayingRef.current && !isBufferingRef.current) {
        const nextTime = timeRef.current + dt * segmentRateRef.current;

        if (nextTime >= TOTAL_DURATION_SEC) {
          timeRef.current = TOTAL_DURATION_SEC;
          setCurrentTimeSec(TOTAL_DURATION_SEC);
          pausePlayback();
        } else {
          const prevSeg = getSegmentAtTime(timeRef.current);
          timeRef.current = nextTime;
          setCurrentTimeSec(nextTime);
          const newSeg = getSegmentAtTime(nextTime);
          if (newSeg.id !== prevSeg.id) {
            void syncSegmentVoiceAtTime(nextTime);
          }
        }
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const amp = audioEngineRef.current?.getVoiceAmplitude() ?? 0;
          const fallbackSpeaking =
            isPlayingRef.current &&
            !isBufferingRef.current &&
            (voiceMuted || silentFallbackRef.current);
          renderStudioFrame(ctx, canvas.width, canvas.height, {
            currentTimeSec: timeRef.current,
            voiceAmplitude: amp,
            isPlaying: fallbackSpeaking,
            showSubtitles,
            images: studioImages,
          });
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    pausePlayback,
    showSubtitles,
    studioImages,
    syncSegmentVoiceAtTime,
    voiceMuted,
  ]);

  useEffect(() => {
    audioEngineRef.current?.setVoiceMuted(voiceMuted);
  }, [voiceMuted]);

  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    engine.setMusicEnabled(musicEnabled);
    if (musicEnabled && isPlaying) {
      engine.startAmbientMusic();
    }
  }, [musicEnabled, isPlaying]);

  useEffect(() => {
    audioEngineRef.current?.setMusicVolume(musicVolume);
  }, [musicVolume]);

  // Direct One-Click Full-Motion Complete MP4 Download Handler!
  const handleInstantMp4Download = async (targetRes?: VideoResolution) => {
    if (isDownloadingMp4) return;
    const chosenRes = targetRes ?? resolution;
    setResolution(chosenRes);
    setIsDownloadingMp4(true);
    setMp4Error(null);
    setMp4Progress({
      percent: 2,
      stage: "بدء تجهيز الفيديو الكامل المتحرك (10:00 دقائق)...",
    });

    try {
      const guaranteedImages = studioImages.amrPresenter
        ? studioImages
        : await preloadStudioImages();
      if (!studioImages.amrPresenter) {
        setStudioImages(guaranteedImages);
      }

      const saved = await downloadInstantLessonMp4({
        resolution: chosenRes,
        showSubtitles: true,
        images: guaranteedImages,
        onProgress: (prog) => setMp4Progress(prog),
      });
      setReadyMp4(saved);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMp4Error(msg);
    } finally {
      setIsDownloadingMp4(false);
    }
  };

  const handleFullscreen = () => {
    const el = playerContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  };

  const handleExportPptx = async () => {
    setIsExportingPptx(true);
    try {
      await exportLessonPresentationPptx();
    } finally {
      setIsExportingPptx(false);
    }
  };

  const handleCopySketch = async () => {
    await navigator.clipboard.writeText(RAW_INO_SKETCH);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const activeChapter = useMemo(
    () => getChapterAtTime(currentTimeSec),
    [currentTimeSec]
  );
  const activeSegment = useMemo(
    () => getSegmentAtTime(currentTimeSec),
    [currentTimeSec]
  );
  const chapterTicks = useMemo(() => getTimelineChapterTicks(), []);

  const canvasPixelWidth = 1920;
  const canvasPixelHeight = 1080;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ==================== STRICT 3-ZONE TOP BAR CONTRACT ==================== */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-8 border-b border-slate-800/90 bg-slate-950/90 px-6 py-4 backdrop-blur-md">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#player"
          className="text-lg font-extrabold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          معمل م. عمرو أحمد
        </a>

        {/* Zone 2: 4 Single-line Navigation Links */}
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden items-center gap-7 text-sm font-medium text-slate-400 md:flex"
        >
          <a
            href="#player"
            className="transition-colors hover:text-slate-100 hover:underline underline-offset-8 whitespace-nowrap shrink-0"
          >
            الدرس المرئي
          </a>
          <a
            href="#chapters"
            className="transition-colors hover:text-slate-100 hover:underline underline-offset-8 whitespace-nowrap shrink-0"
          >
            فصول الـ 10 دقائق
          </a>
          <a
            href="#lab"
            className="transition-colors hover:text-slate-100 hover:underline underline-offset-8 whitespace-nowrap shrink-0"
          >
            المعمل التفاعلي
          </a>
          <a
            href="#resources"
            className="transition-colors hover:text-slate-100 hover:underline underline-offset-8 whitespace-nowrap shrink-0"
          >
            الكود والبرزنتيشن
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action — Instant Direct MP4 Download! */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            disabled={isDownloadingMp4}
            onClick={() => void handleInstantMp4Download()}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-500 disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {isDownloadingMp4 ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>
              {isDownloadingMp4
                ? `جاري التجهيز ${mp4Progress?.percent ?? 0}%`
                : "تحميل الفيديو MP4"}
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1360px] px-4 py-8 sm:px-8">
        {/* ==================== HERO & BROADCAST VIDEO STAGE ==================== */}
        <section id="player" className="pb-14">
          {/* Unboxed Metadata Discipline */}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-cyan-400">
              {LESSON_METADATA.instructorName}
            </span>
            <span aria-hidden="true">·</span>
            <span>{LESSON_METADATA.instructorRole}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">المدة الكاملة 10:00 دقائق</span>
            <span aria-hidden="true">·</span>
            <span>شرح باللهجة المصرية</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{LESSON_METADATA.boardModel}</span>
          </div>

          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <h1
              className="max-w-3xl text-2xl font-extrabold leading-tight text-slate-50 sm:text-4xl"
              style={{ textWrap: "balance" }}
            >
              {LESSON_METADATA.title}
            </h1>

            {/* Direct Instant Download Controls right next to Headline */}
            <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
                <button
                  type="button"
                  onClick={() => setResolution("720p")}
                  className={`rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    resolution === "720p"
                      ? "bg-cyan-600 text-white"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  720p HD سريع
                </button>
                <button
                  type="button"
                  onClick={() => setResolution("1080p")}
                  className={`rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    resolution === "1080p"
                      ? "bg-cyan-600 text-white"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  1080p Full HD
                </button>
              </div>

              <button
                type="button"
                disabled={isDownloadingMp4}
                onClick={() => void handleInstantMp4Download()}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-emerald-500 disabled:opacity-70 whitespace-nowrap shrink-0"
              >
                {isDownloadingMp4 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>
                  {isDownloadingMp4
                    ? `جاري تحضير الفيديو المتحرك (${mp4Progress?.percent ?? 0}%)`
                    : `تحميل الفيديو كامل متحرك (.mp4)`}
                </span>
              </button>
            </div>
          </div>

          {/* Live Fast-Compile Progress Banner (Only shown during the few seconds of first-time MP4 build) */}
          {isDownloadingMp4 && mp4Progress && (
            <div className="mb-5 rounded-xl border border-cyan-500/40 bg-slate-900/90 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-cyan-300">{mp4Progress.stage}</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {mp4Progress.percent}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-cyan-500 transition-all duration-300"
                  style={{ width: `${mp4Progress.percent}%` }}
                />
              </div>
            </div>
          )}

          {mp4Error && (
            <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-xs text-red-200">
              <span>{mp4Error}</span>
              <button
                type="button"
                onClick={() => void handleInstantMp4Download()}
                className="rounded bg-red-600 px-3 py-1.5 font-bold text-white hover:bg-red-500 whitespace-nowrap"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* 16:9 Cinema Broadcast Canvas Container */}
          <div
            ref={playerContainerRef}
            className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
          >
            <div className="relative aspect-video w-full bg-slate-950">
              <canvas
                ref={canvasRef}
                width={canvasPixelWidth}
                height={canvasPixelHeight}
                onClick={togglePlayPause}
                className="h-full w-full cursor-pointer object-contain"
              />

              {isBufferingVoice && (
                <div className="pointer-events-none absolute top-4 left-4 flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-slate-950/90 px-3.5 py-2 text-xs font-semibold text-cyan-300 backdrop-blur-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                  <span>جاري تحميل مقطع الصوت...</span>
                </div>
              )}

              {!isPlaying && currentTimeSec === 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/20">
                  <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/40 bg-slate-950/85 px-6 py-4 text-slate-100 shadow-2xl backdrop-blur-md">
                    <Play className="h-7 w-7 fill-cyan-400 text-cyan-400" />
                    <div className="text-right">
                      <p className="text-base font-bold">
                        شاهد الدرس هنا أو حمّله مباشرة بصيغة MP4 من الزرار الأخضر فوق
                      </p>
                      <p className="text-xs text-slate-400">
                        10:00 دقائق كاملة بصوت المهندس عمرو أحمد باللهجة المصرية
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Player Timeline & Transport Bar */}
            <div className="space-y-3 border-t border-slate-800 bg-slate-900/95 px-4 py-4 sm:px-6">
              <div className="space-y-1.5">
                <div className="relative flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={TOTAL_DURATION_SEC}
                    step={0.2}
                    value={currentTimeSec}
                    aria-label="شريط تقدم الفيديو بالثواني"
                    onChange={(e) => seekTo(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-cyan-500"
                  />
                </div>
                <div className="hidden justify-between px-0.5 text-[11px] text-slate-500 md:flex">
                  {chapterTicks.map((tick) => (
                    <button
                      key={tick.id}
                      type="button"
                      onClick={() =>
                        seekTo(
                          LESSON_CHAPTERS.find((c) => c.id === tick.id)
                            ?.startSec ?? 0
                        )
                      }
                      className={`truncate max-w-[130px] transition-colors hover:text-cyan-300 ${
                        activeChapter.id === tick.id
                          ? "font-bold text-cyan-400"
                          : ""
                      }`}
                    >
                      {tick.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-500 whitespace-nowrap shrink-0"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-4 w-4" />
                        <span>إيقاف مؤقت</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 fill-current" />
                        <span>تشغيل المعاينة</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => seekTo(currentTimeSec - 10)}
                    title="رجوع 10 ثوانٍ"
                    className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-300 transition-colors hover:border-slate-700 hover:text-white"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => seekTo(currentTimeSec + 10)}
                    title="تقديم 10 ثوانٍ"
                    className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-300 transition-colors hover:border-slate-700 hover:text-white"
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>

                  <span
                    dir="ltr"
                    className="font-mono text-xs font-semibold tabular-nums text-slate-300 sm:text-sm"
                  >
                    {formatSecondsMMSS(currentTimeSec)} /{" "}
                    {formatSecondsMMSS(TOTAL_DURATION_SEC)}
                  </span>
                </div>

                {/* Audio, Music, Subtitles, Fullscreen */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setVoiceMuted((m) => !m)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      !voiceMuted
                        ? "border-slate-700 bg-slate-800 text-slate-100"
                        : "border-slate-800 bg-slate-950 text-slate-500"
                    }`}
                  >
                    {voiceMuted ? (
                      <VolumeX className="h-4 w-4 text-red-400" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-cyan-400" />
                    )}
                    <span>صوت م. عمرو</span>
                  </button>

                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => setMusicEnabled((e) => !e)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap"
                    >
                      <Music
                        className={`h-3.5 w-3.5 ${
                          musicEnabled ? "text-amber-400" : "text-slate-600"
                        }`}
                      />
                      <span>موسيقى هادئة</span>
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={0.3}
                      step={0.02}
                      value={musicEnabled ? musicVolume : 0}
                      aria-label="مستوى الموسيقى الخلفية"
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setMusicVolume(v);
                        setMusicEnabled(v > 0);
                      }}
                      className="h-1.5 w-16 cursor-pointer appearance-none rounded bg-slate-800 accent-amber-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSubtitles((s) => !s)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      showSubtitles
                        ? "border-cyan-500/40 bg-cyan-950/50 text-cyan-200"
                        : "border-slate-800 bg-slate-950 text-slate-400"
                    }`}
                  >
                    <Subtitles className="h-4 w-4" />
                    <span>الترجمة العربية</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFullscreen}
                    title="ملء الشاشة"
                    className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-300 transition-colors hover:border-slate-700 hover:text-white"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {ttsWarning && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3.5 py-2 text-xs text-amber-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>{ttsWarning}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSilentFallbackMode((prev) => !prev);
                      setTtsWarning(null);
                    }}
                    className="underline hover:text-white whitespace-nowrap"
                  >
                    {silentFallbackMode
                      ? "إعادة تفعيل التوليد الصوتي"
                      : "المتابعة بالترجمة والموسيقى فقط"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ==================== DIRECT DOWNLOAD BAR (MP4 + PPTX + INO — VERIFIED BLOB DOWNLOAD!) ==================== */}
          <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:grid-cols-12 lg:items-center">
            <div className="space-y-1 lg:col-span-6">
              <h2 className="text-base font-bold text-slate-100">
                تحميل الفيديو الكامل متحركاً بضغطة واحدة (10:00 دقائق كاملة)
              </h2>
              <p className="text-xs leading-relaxed text-slate-400">
                يشرح المهندس عمرو أحمد بحركة كاملة للجسم والذراعين ومؤشر السبورة
                الذكية متزامنة مع صوته باللهجة المصرية الصافية بدايةً من
                «السلام عليكم يا شباب» مباشرةً، بصيغة{" "}
                <span className="font-mono text-slate-200">MP4</span> تعمل فوراً
                على الموبايل والكمبيوتر{" "}
                <span className="tabular-nums text-cyan-400">
                  (تم تجهيز {serverVoiceReadyCount} من {LESSON_SEGMENTS.length}{" "}
                  مقطع صوتي نقي في الخلفية)
                </span>
                .
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:col-span-6 lg:justify-end">
              <button
                type="button"
                disabled={isDownloadingMp4}
                onClick={() => void handleInstantMp4Download("720p")}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {isDownloadingMp4 && resolution === "720p" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Film className="h-4 w-4" />
                )}
                <span>تحميل 720p HD كامل متحرك</span>
              </button>

              <button
                type="button"
                disabled={isDownloadingMp4}
                onClick={() => void handleInstantMp4Download("1080p")}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-cyan-500 disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {isDownloadingMp4 && resolution === "1080p" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>تحميل 1080p Full HD كامل</span>
              </button>

              <button
                type="button"
                disabled={isExportingPptx}
                onClick={handleExportPptx}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/40 px-4 py-2.5 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-900/50 disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="h-4 w-4 text-amber-400" />
                <span>
                  {isExportingPptx
                    ? "جاري التحضير..."
                    : "تحميل برزنتيشن (.pptx)"}
                </span>
              </button>
            </div>

            {readyMp4 && (
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-3 text-xs text-emerald-300 lg:col-span-12">
                <span>
                  تم تنزيل الفيديو الكامل بنجاح:{" "}
                  <span className="font-mono text-emerald-200">
                    {readyMp4.fileName}
                  </span>{" "}
                  · الحجم الفعلي المؤكد:{" "}
                  <span className="font-mono font-bold tabular-nums text-white">
                    {readyMp4.sizeMb} MB
                  </span>{" "}
                  (10:00 دقائق بالصوت والصورة المتحركة)
                </span>
                <a
                  href={readyMp4.blobUrl}
                  download={readyMp4.fileName}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 font-bold text-white hover:bg-emerald-500 whitespace-nowrap"
                >
                  <Download className="h-4 w-4" />
                  <span>حفظ نسخة أخرى ({readyMp4.sizeMb} MB)</span>
                </a>
              </div>
            )}
          </div>
        </section>

        {/* ==================== 9 CHAPTERS BREAKDOWN (10 MINUTES) ==================== */}
        <section
          id="chapters"
          className="border-t border-slate-800/80 py-14"
          aria-labelledby="chapters-heading"
        >
          <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-medium text-cyan-400">
                الهيكل الزمني الكامل · 9 فصول متدرجة من الصفر
              </p>
              <h2
                id="chapters-heading"
                className="mt-1 text-2xl font-bold text-slate-100 sm:text-3xl"
              >
                تقسيم الـ 10 دقائق والسيناريو الحرفي للمهندس عمرو أحمد
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              اضغط على أي فصل للانتقال الفوري إليه وتشغيله بالصوت والصورة
            </p>
          </div>

          <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>
                النص المنطوق حالياً · الفصل {activeChapter.numberLabel} (
                {activeChapter.title})
              </span>
              <span dir="ltr" className="font-mono tabular-nums text-cyan-400">
                {formatSecondsMMSS(activeSegment.startSec)} –{" "}
                {formatSecondsMMSS(activeSegment.endSec)}
              </span>
            </div>
            <p className="text-base leading-relaxed font-semibold text-slate-100 sm:text-lg">
              «{activeSegment.narrationAr}»
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {LESSON_CHAPTERS.map((ch) => {
              const isCurrent = activeChapter.id === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => startPlaybackAt(ch.startSec)}
                  className={`group flex flex-col justify-between rounded-2xl border p-5 text-right transition-all ${
                    isCurrent
                      ? "border-cyan-500 bg-slate-900 shadow-lg"
                      : "border-slate-800/90 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/80"
                  }`}
                >
                  <div>
                    <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                      <span className="font-bold text-cyan-400">
                        {ch.numberLabel}. الفصل
                      </span>
                      <span
                        dir="ltr"
                        className="font-mono tabular-nums text-slate-300"
                      >
                        {ch.timeRangeLabel}
                      </span>
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-100 group-hover:text-cyan-300">
                      {ch.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-400">
                      {ch.summary}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs font-semibold text-cyan-400">
                    <span>
                      {isCurrent && isPlaying
                        ? "يعمل الآن في المشغل"
                        : "تشغيل هذا الفصل"}
                    </span>
                    <Play className="h-3.5 w-3.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ==================== INTERACTIVE HARDWARE LAB ==================== */}
        <InteractiveLedLab />

        {/* ==================== CODE BREAKDOWN & 5 PROJECTS REFERENCE ==================== */}
        <section
          id="resources"
          className="border-t border-slate-800/80 py-14"
          aria-labelledby="resources-heading"
        >
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
            <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-7">
              <div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-cyan-400">
                      كود المشروع الأول جاهز للنسخ والرفع على Arduino IDE
                    </p>
                    <h2
                      id="resources-heading"
                      className="mt-1 text-xl font-bold text-slate-100 sm:text-2xl"
                    >
                      شرح الكود سطراً بسطر بدون حفظ
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopySketch}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>نسخ الكود</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={downloadArduinoSketchFile}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-cyan-500 whitespace-nowrap shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>تنزيل ملف .ino</span>
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950">
                  {LED_PROJECT_CODE.map((row) => (
                    <div
                      key={row.lineNumber}
                      className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-12 sm:items-center"
                    >
                      <div
                        dir="ltr"
                        className="font-mono text-xs font-semibold text-amber-300 sm:col-span-5"
                      >
                        <span className="mr-3 inline-block w-4 text-slate-600 select-none tabular-nums">
                          {row.lineNumber}
                        </span>
                        {row.code}
                      </div>
                      <p className="text-xs text-slate-300 sm:col-span-7">
                        {row.explanationAr}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-5 text-xs leading-relaxed text-slate-400">
                ملاحظة هندسية: الرجل الرقمية{" "}
                <span className="font-mono text-slate-200">Pin 13</span> في لوحة{" "}
                <span className="font-mono text-slate-200">Arduino UNO</span>{" "}
                مربوطة أيضاً باللمبة المدمجة{" "}
                <span className="font-mono text-amber-300">L</span> على سطح
                البوردة، لذلك ستلاحظ وميضها بالتزامن مع الـ LED الخارجي!
              </p>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-5">
              <div>
                <p className="text-xs font-medium text-amber-400">
                  الفصل الثامن (08:00 – 09:00) · خطوتك بعد هذا الدرس
                </p>
                <h3 className="mt-1 mb-5 text-xl font-bold text-slate-100">
                  5 مشاريع حقيقية تقدر تبنيها بالأردوينو
                </h3>

                <div className="space-y-4">
                  {FIVE_PROJECTS_DATA.map((proj) => (
                    <div
                      key={proj.index}
                      className="border-b border-slate-800/70 pb-3.5 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-100">
                          0{proj.index}. {proj.titleAr}
                        </h4>
                        <span
                          dir="ltr"
                          className="font-mono text-[11px] text-cyan-400 shrink-0"
                        >
                          {proj.componentsEn}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        {proj.descriptionAr}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs leading-relaxed font-semibold text-slate-200">
                  «افتكر دايماً إن المهندس الشاطر مش اللي بيحفظ الأكواد، المهندس
                  الشاطر هو اللي بيفهم إزاي الحاجة بتشتغل وليه.»
                </p>
                <p className="mt-1.5 text-xs text-cyan-400">
                  — المهندس عمرو أحمد
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        <div className="mx-auto flex max-w-[1360px] flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <p>
            معمل المهندس عمرو أحمد للإلكترونيات والروبوتكس — درس مدخل Arduino UNO
            من الصفر (10:00 دقائق)
          </p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => void handleInstantMp4Download()}
              className="hover:text-slate-300 transition-colors whitespace-nowrap"
            >
              تحميل الفيديو المباشر (.mp4)
            </button>
            <button
              type="button"
              onClick={handleExportPptx}
              className="hover:text-slate-300 transition-colors whitespace-nowrap"
            >
              تنزيل العرض التقديمي (.pptx)
            </button>
            <button
              type="button"
              onClick={downloadArduinoSketchFile}
              className="hover:text-slate-300 transition-colors whitespace-nowrap"
            >
              تنزيل الكود (.ino)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

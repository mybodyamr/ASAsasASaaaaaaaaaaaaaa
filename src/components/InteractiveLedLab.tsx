import React, { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, AlertTriangle, CheckCircle2, Zap } from "lucide-react";

type ResistorOption = 220 | 1000 | 0;

export const InteractiveLedLab: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [delayMs, setDelayMs] = useState<number>(1000);
  const [resistorOhm, setResistorOhm] = useState<ResistorOption>(220);
  const [pinHigh, setPinHigh] = useState<boolean>(true);

  useEffect(() => {
    if (!isRunning) {
      setPinHigh(false);
      return;
    }
    setPinHigh(true);
    const interval = window.setInterval(() => {
      setPinHigh((prev) => !prev);
    }, delayMs);
    return () => clearInterval(interval);
  }, [isRunning, delayMs]);

  const isBurnedOut = resistorOhm === 0 && isRunning;
  const currentMa =
    resistorOhm === 0
      ? 120 // Unsafe surge > 20mA max LED rating
      : Number(((5.0 - 2.0) / resistorOhm * 1000).toFixed(1));

  const ledBrightness =
    !isRunning || !pinHigh || isBurnedOut
      ? 0
      : resistorOhm === 220
        ? 1
        : 0.45;

  return (
    <section
      id="lab"
      className="border-t border-slate-800/80 py-14"
      aria-labelledby="lab-heading"
    >
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-xs font-medium text-cyan-400">
          تطبيق عملي تفاعلي · الفصل السادس (05:00 – 07:00)
        </p>
        <h2
          id="lab-heading"
          className="text-2xl font-bold text-slate-100 sm:text-3xl"
        >
          معمل التجربة اليدوية: اختبر دائرة الـ LED والمقاومة بنفسك
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
          جرّب نصيحة المهندس عمرو أحمد عملياً: غيّر زمن الانتظار{" "}
          <code className="font-mono text-amber-300">delay()</code> أو بدّل قيمة
          المقاومة لترى تأثير قانون أوم على شدة الإضاءة وحماية الـ LED من التلف.
        </p>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
        {/* Left / Stage Zone (7 cols): Interactive SVG Hardware Schematic */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-6 lg:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 text-xs text-slate-400">
            <span>اللوحة: Arduino UNO R3 · المنفذ الرقمي Pin 13</span>
            <span className="font-mono tabular-nums text-slate-200">
              {isBurnedOut
                ? "▲ OVERLOAD (>100 mA — تلف الـ LED!)"
                : pinHigh && isRunning
                  ? `● HIGH (5.0V · ${currentMa} mA)`
                  : "○ LOW (0.0V · 0.0 mA)"}
            </span>
          </div>

          <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-xl bg-slate-950 p-4">
            <svg
              viewBox="0 0 680 300"
              className="h-auto w-full max-w-[640px]"
              role="img"
              aria-label="مخطط توصيل Arduino UNO مع المقاومة والـ LED"
            >
              {/* Arduino UNO Simplified Block */}
              <rect
                x="30"
                y="45"
                width="205"
                height="210"
                rx="14"
                fill="#007880"
                stroke="#22D3EE"
                strokeWidth="2"
              />
              <text
                x="132"
                y="95"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="20"
                fontWeight="700"
                fontFamily="Cairo, sans-serif"
              >
                Arduino UNO
              </text>
              <rect
                x="62"
                y="165"
                width="140"
                height="44"
                rx="6"
                fill="#0F172A"
                stroke="#334155"
              />
              <text
                x="132"
                y="192"
                textAnchor="middle"
                fill="#E2E8F0"
                fontSize="12"
                fontFamily="IBM Plex Mono, monospace"
              >
                ATmega328P
              </text>

              {/* Pin 13 Socket */}
              <rect x="215" y="82" width="20" height="20" rx="4" fill="#0F172A" />
              <text
                x="205"
                y="97"
                textAnchor="end"
                fill="#FDE047"
                fontSize="13"
                fontWeight="700"
                fontFamily="IBM Plex Mono, monospace"
              >
                Pin 13
              </text>

              {/* GND Socket */}
              <rect x="215" y="206" width="20" height="20" rx="4" fill="#0F172A" />
              <text
                x="205"
                y="221"
                textAnchor="end"
                fill="#FDE047"
                fontSize="13"
                fontWeight="700"
                fontFamily="IBM Plex Mono, monospace"
              >
                GND
              </text>

              {/* Positive Wire: Pin 13 -> Resistor */}
              <path
                d="M 235 92 L 320 92"
                stroke={pinHigh && isRunning ? "#EF4444" : "#64748B"}
                strokeWidth="5"
                strokeLinecap="round"
              />

              {/* Resistor or Direct Jumper */}
              {resistorOhm > 0 ? (
                <g>
                  <rect
                    x="320"
                    y="78"
                    width="96"
                    height="28"
                    rx="10"
                    fill="#FDE68A"
                    stroke="#B45309"
                    strokeWidth="2"
                  />
                  <rect
                    x="338"
                    y="79"
                    width="7"
                    height="26"
                    fill={resistorOhm === 220 ? "#DC2626" : "#78350F"}
                  />
                  <rect
                    x="354"
                    y="79"
                    width="7"
                    height="26"
                    fill={resistorOhm === 220 ? "#DC2626" : "#0F172A"}
                  />
                  <rect
                    x="370"
                    y="79"
                    width="7"
                    height="26"
                    fill={resistorOhm === 220 ? "#78350F" : "#DC2626"}
                  />
                  <rect x="392" y="79" width="6" height="26" fill="#D97706" />
                  <text
                    x="368"
                    y="66"
                    textAnchor="middle"
                    fill="#F8FAFC"
                    fontSize="13"
                    fontWeight="600"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {resistorOhm}Ω Resistor
                  </text>
                </g>
              ) : (
                <g>
                  <path
                    d="M 320 92 L 416 92"
                    stroke="#EF4444"
                    strokeWidth="5"
                    strokeDasharray="8 5"
                  />
                  <text
                    x="368"
                    y="70"
                    textAnchor="middle"
                    fill="#FCA5A5"
                    fontSize="13"
                    fontWeight="700"
                    fontFamily="Cairo, sans-serif"
                  >
                    سلك مباشر بدون مقاومة!
                  </text>
                </g>
              )}

              {/* Wire from Resistor -> LED Anode (+) */}
              <path
                d="M 416 92 L 535 92 L 535 128"
                fill="none"
                stroke={pinHigh && isRunning ? "#EF4444" : "#64748B"}
                strokeWidth="5"
                strokeLinecap="round"
              />

              {/* Ground Wire: LED Cathode (-) -> GND */}
              <path
                d="M 565 168 L 565 216 L 235 216"
                fill="none"
                stroke="#475569"
                strokeWidth="5"
                strokeLinecap="round"
              />

              {/* LED Glow Effect */}
              {ledBrightness > 0 && (
                <circle
                  cx="550"
                  cy="145"
                  r={ledBrightness === 1 ? 62 : 36}
                  fill="rgba(239, 68, 68, 0.32)"
                />
              )}

              {/* 5mm LED Component */}
              <path
                d="M 526 156 L 526 136 A 24 24 0 0 1 574 136 L 574 156 Z"
                fill={
                  isBurnedOut
                    ? "#1E293B"
                    : ledBrightness > 0
                      ? "#FF3B3B"
                      : "#7F1D1D"
                }
                stroke={
                  isBurnedOut
                    ? "#EF4444"
                    : ledBrightness > 0
                      ? "#FCA5A5"
                      : "#991B1B"
                }
                strokeWidth="2.5"
              />

              {/* Burnout Cross */}
              {isBurnedOut && (
                <g stroke="#F87171" strokeWidth="4" strokeLinecap="round">
                  <line x1="536" y1="126" x2="564" y2="154" />
                  <line x1="564" y1="126" x2="536" y2="154" />
                </g>
              )}

              {/* LED Legs Labels */}
              <line
                x1="535"
                y1="156"
                x2="535"
                y2="176"
                stroke="#CBD5E1"
                strokeWidth="3.5"
              />
              <line
                x1="565"
                y1="156"
                x2="565"
                y2="168"
                stroke="#CBD5E1"
                strokeWidth="3.5"
              />
              <text
                x="518"
                y="148"
                textAnchor="end"
                fill="#FCA5A5"
                fontSize="12"
                fontFamily="IBM Plex Mono, monospace"
              >
                Anode (+)
              </text>
              <text
                x="584"
                y="148"
                textAnchor="start"
                fill="#93C5FD"
                fontSize="12"
                fontFamily="IBM Plex Mono, monospace"
              >
                Cathode (-)
              </text>
            </svg>
          </div>

          {/* Diagnostic Note */}
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-sm">
            {isBurnedOut ? (
              <>
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                <p className="text-red-200">
                  <strong>تنبيه هندسي من م. عمرو أحمد:</strong> توصيل 5 فولت مباشرة
                  بدون مقاومة يمرر تياراً يتجاوز{" "}
                  <span className="font-mono">100mA</span> بينما أقصى احتمال للـ
                  LED هو <span className="font-mono">20mA</span>، مما يؤدي لاحتراقه
                  فوراً! أعد اختيار المقاومة <span className="font-mono">220Ω</span>.
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <p className="text-slate-300">
                  <strong>توصيل آمن وسليم:</strong> المقاومة{" "}
                  <span className="font-mono text-cyan-300">{resistorOhm}Ω</span>{" "}
                  تضبط التيار عند{" "}
                  <span className="font-mono text-amber-300">{currentMa} mA</span>،
                  والكود يكرر الإضاءة والإطفاء كل{" "}
                  <span className="font-mono text-cyan-300">{delayMs} ms</span>.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Right / Control & Live Code Deck (5 cols) */}
        <div className="flex flex-col justify-between gap-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 lg:col-span-5">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-slate-100">
                لوحة التحكم في التجربة
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRunning((r) => !r)}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-500 whitespace-nowrap shrink-0"
                >
                  {isRunning ? (
                    <>
                      <Pause className="h-4 w-4" />
                      <span>إيقاف مؤقت</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      <span>تشغيل الدائرة</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDelayMs(1000);
                    setResistorOhm(220);
                    setIsRunning(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>إعادة ضبط</span>
                </button>
              </div>
            </div>

            {/* Labeled Slider with Explicit Value & Unit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="delay-slider" className="font-medium text-slate-200">
                  زمن الانتظار في الكود (delay)
                </label>
                <span className="font-mono tabular-nums font-semibold text-cyan-400">
                  {delayMs} ms ({(delayMs / 1000).toFixed(1)} ثانية)
                </span>
              </div>
              <input
                id="delay-slider"
                type="range"
                min={200}
                max={2000}
                step={100}
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-cyan-500"
              />
              <div className="flex justify-between font-mono text-xs text-slate-500">
                <span>200 ms (نبض سريع)</span>
                <span>1000 ms (افتراضي)</span>
                <span>2000 ms (بطيء)</span>
              </div>
            </div>

            {/* Interactive Resistor Segmented Selector */}
            <div className="space-y-2">
              <span className="block text-sm font-medium text-slate-200">
                قيمة مقاومة الحماية في الدائرة
              </span>
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-950 p-1.5">
                <button
                  type="button"
                  onClick={() => setResistorOhm(220)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    resistorOhm === 220
                      ? "bg-cyan-600 text-white"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  220Ω (مثالي)
                </button>
                <button
                  type="button"
                  onClick={() => setResistorOhm(1000)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    resistorOhm === 1000
                      ? "bg-cyan-600 text-white"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  1000Ω (إضاءة أهدأ)
                </button>
                <button
                  type="button"
                  onClick={() => setResistorOhm(0)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    resistorOhm === 0
                      ? "bg-red-600 text-white"
                      : "text-slate-400 hover:text-red-300"
                  }`}
                >
                  بدون مقاومة!
                </button>
              </div>
            </div>
          </div>

          {/* Live Synced Code Preview */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                الكود الفعلي المتزامن مع إعداداتك
              </span>
              <span className="font-mono">Arduino C++</span>
            </div>
            <pre
              dir="ltr"
              className="overflow-x-auto font-mono text-xs leading-6 text-slate-200"
            >
              <code>
                {"void setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n"}
                <span
                  className={
                    pinHigh && isRunning && !isBurnedOut
                      ? "block rounded bg-cyan-500/20 px-1 text-amber-300"
                      : "block px-1"
                  }
                >
                  {`  digitalWrite(13, HIGH); // 5V -> LED ON\n  delay(${delayMs});`}
                </span>
                <span
                  className={
                    !pinHigh && isRunning && !isBurnedOut
                      ? "block rounded bg-slate-800 px-1 text-cyan-300"
                      : "block px-1"
                  }
                >
                  {`  digitalWrite(13, LOW);  // 0V -> LED OFF\n  delay(${delayMs});`}
                </span>
                {"}"}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};

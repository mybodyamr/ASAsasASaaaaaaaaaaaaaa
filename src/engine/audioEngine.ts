/**
 * Studio Web Audio Engine:
 * - Decodes and caches Gemini TTS WAV buffers per segment
 * - Provides live voice amplitude level (0..1) via AnalyserNode for Eng. Amr's studio visual
 * - Generates warm, calm background ambient music via soft filtered oscillators (auto-ducks under voice)
 * - Exposes a clean MediaStreamAudioDestinationNode so MediaRecorder records crisp digital voice + music
 */

export class StudioAudioEngine {
  private ctx: AudioContext | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private voiceGain: GainNode | null = null;
  private musicMasterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserData: Uint8Array<ArrayBuffer> | null = null;

  private activeVoiceSource: AudioBufferSourceNode | null = null;
  private activeSegmentId: string | null = null;

  private decodedBuffers = new Map<string, AudioBuffer>();
  private pendingFetches = new Map<string, Promise<AudioBuffer | null>>();

  private musicOscillators: OscillatorNode[] = [];
  private musicChordTimer: number | null = null;
  private musicEnabled = true;
  private musicVolume = 0.14; // Calm background level so it never masks instructor voice
  private voiceMuted = false;
  private isSpeaking = false;

  public ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();
      this.streamDest = this.ctx.createMediaStreamDestination();

      this.voiceGain = this.ctx.createGain();
      this.voiceGain.gain.value = 1.0;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.78;
      this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);

      this.voiceGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.analyser.connect(this.streamDest);

      this.musicMasterGain = this.ctx.createGain();
      this.musicMasterGain.gain.value = 0.0;
      this.musicMasterGain.connect(this.ctx.destination);
      this.musicMasterGain.connect(this.streamDest);
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }

    return this.ctx;
  }

  public getRecordingAudioStream(): MediaStream | null {
    this.ensureContext();
    return this.streamDest?.stream ?? null;
  }

  public hasDecodedSegment(segmentId: string, voiceName = "Charon"): boolean {
    return this.decodedBuffers.has(`${voiceName}:${segmentId}`);
  }

  public getDecodedDuration(
    segmentId: string,
    voiceName = "Charon"
  ): number | null {
    const buf = this.decodedBuffers.get(`${voiceName}:${segmentId}`);
    return buf ? buf.duration : null;
  }

  public async fetchAndDecodeSegment(
    segmentId: string,
    text: string,
    voiceName = "Charon"
  ): Promise<AudioBuffer | null> {
    const key = `${voiceName}:${segmentId}`;
    const existing = this.decodedBuffers.get(key);
    if (existing) {
      return existing;
    }

    const inflight = this.pendingFetches.get(key);
    if (inflight) {
      return inflight;
    }

    const promise = (async (): Promise<AudioBuffer | null> => {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segmentId, text, voiceName }),
        });

        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(errBody.error || `HTTP ${res.status}`);
        }

        const data = (await res.json()) as {
          audioBase64: string;
          mimeType: string;
        };

        const binary = atob(data.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const ctx = this.ensureContext();
        const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
        this.decodedBuffers.set(key, audioBuffer);
        return audioBuffer;
      } catch (err) {
        console.warn("TTS segment fetch warning:", segmentId, err);
        throw err;
      } finally {
        this.pendingFetches.delete(key);
      }
    })();

    this.pendingFetches.set(key, promise);
    return promise;
  }

  public playSegmentBuffer(
    segmentId: string,
    buffer: AudioBuffer,
    offsetSec = 0,
    onEnded?: () => void
  ): void {
    const ctx = this.ensureContext();
    this.stopVoice();

    if (offsetSec >= buffer.duration - 0.08) {
      this.isSpeaking = false;
      this.updateMusicDucking();
      onEnded?.();
      return;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (this.voiceGain) {
      source.connect(this.voiceGain);
    }

    this.activeVoiceSource = source;
    this.activeSegmentId = segmentId;
    this.isSpeaking = true;
    this.updateMusicDucking();

    source.onended = () => {
      if (this.activeVoiceSource === source) {
        this.activeVoiceSource = null;
        this.activeSegmentId = null;
        this.isSpeaking = false;
        this.updateMusicDucking();
        onEnded?.();
      }
    };

    source.start(0, Math.max(0, offsetSec));
  }

  public stopVoice(): void {
    if (this.activeVoiceSource) {
      try {
        this.activeVoiceSource.onended = null;
        this.activeVoiceSource.stop();
        this.activeVoiceSource.disconnect();
      } catch {
        // Ignore already stopped source
      }
      this.activeVoiceSource = null;
    }
    this.activeSegmentId = null;
    this.isSpeaking = false;
    this.updateMusicDucking();
  }

  public getActiveSegmentId(): string | null {
    return this.activeSegmentId;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getVoiceAmplitude(): number {
    if (!this.analyser || !this.analyserData || !this.isSpeaking) {
      return 0;
    }
    this.analyser.getByteFrequencyData(this.analyserData);
    let sum = 0;
    const count = Math.min(36, this.analyserData.length);
    for (let i = 2; i < count; i++) {
      sum += this.analyserData[i];
    }
    const avg = sum / Math.max(1, count - 2);
    return Math.min(1, avg / 145);
  }

  public setVoiceMuted(muted: boolean): void {
    this.voiceMuted = muted;
    if (this.voiceGain && this.ctx) {
      this.voiceGain.gain.setTargetAtTime(
        muted ? 0 : 1.0,
        this.ctx.currentTime,
        0.04
      );
    }
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    this.updateMusicDucking();
  }

  public setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(0.4, vol));
    this.updateMusicDucking();
  }

  public startAmbientMusic(): void {
    const ctx = this.ensureContext();
    if (this.musicOscillators.length > 0) {
      this.updateMusicDucking();
      return;
    }

    // Calm educational studio pad progression (warm low-pass filtered triangle + sine waves)
    const chords = [
      [130.81, 196.0, 246.94, 293.66], // Cmaj9 subtle
      [110.0, 164.81, 220.0, 261.63],  // Am7 warm
      [146.83, 220.0, 261.63, 329.63], // Dm9 gentle
      [98.0, 146.83, 196.0, 246.94],   // G6 calm
    ];

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    filter.Q.value = 0.7;

    if (this.musicMasterGain) {
      filter.connect(this.musicMasterGain);
    }

    const oscs: OscillatorNode[] = [];
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const individualGain = ctx.createGain();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = chords[0][i];
      individualGain.gain.value = i === 0 ? 0.28 : 0.16;
      osc.connect(individualGain);
      individualGain.connect(filter);
      osc.start();
      oscs.push(osc);
    }

    this.musicOscillators = oscs;

    let chordIndex = 0;
    this.musicChordTimer = window.setInterval(() => {
      if (!this.ctx || this.musicOscillators.length === 0) return;
      chordIndex = (chordIndex + 1) % chords.length;
      const nextChord = chords[chordIndex];
      const now = this.ctx.currentTime;
      this.musicOscillators.forEach((osc, idx) => {
        osc.frequency.exponentialRampToValueAtTime(nextChord[idx], now + 1.8);
      });
    }, 5500);

    this.updateMusicDucking();
  }

  public stopAmbientMusic(): void {
    if (this.musicChordTimer !== null) {
      clearInterval(this.musicChordTimer);
      this.musicChordTimer = null;
    }
    if (this.musicMasterGain && this.ctx) {
      this.musicMasterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
    setTimeout(() => {
      for (const osc of this.musicOscillators) {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore
        }
      }
      this.musicOscillators = [];
    }, 220);
  }

  private updateMusicDucking(): void {
    if (!this.musicMasterGain || !this.ctx) return;
    if (!this.musicEnabled || this.musicOscillators.length === 0) {
      this.musicMasterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
      return;
    }
    // Auto-duck background music under Eng. Amr's voice so narration is crystal clear
    const target = this.isSpeaking ? this.musicVolume * 0.35 : this.musicVolume;
    this.musicMasterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
  }

  public destroy(): void {
    this.stopVoice();
    this.stopAmbientMusic();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private readonly SOUND_ENABLED_KEY = 'droppy_sound_enabled';
  enabled = signal<boolean>(this.getInitialState());
  private audioCtx: AudioContext | null = null;

  toggleSound(): boolean {
    const next = !this.enabled();
    this.enabled.set(next);
    try {
      localStorage.setItem(this.SOUND_ENABLED_KEY, String(next));
    } catch {
      // ignore
    }
    if (next) {
      this.playSuccessChime();
    }
    return next;
  }

  playLeakAlert(): void {
    if (!this.enabled()) return;
    this.playToneSequence([
      { freq: 880, duration: 0.12, type: 'triangle' },
      { freq: 1174, duration: 0.2, type: 'sine' },
      { freq: 1480, duration: 0.35, type: 'sine' }
    ]);
  }

  playSuccessChime(): void {
    if (!this.enabled()) return;
    this.playToneSequence([
      { freq: 523.25, duration: 0.1, type: 'sine' }, // C5
      { freq: 659.25, duration: 0.1, type: 'sine' }, // E5
      { freq: 783.99, duration: 0.25, type: 'sine' }  // G5
    ]);
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private playToneSequence(tones: { freq: number; duration: number; type: OscillatorType }[]): void {
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      let startTime = ctx.currentTime;
      tones.forEach(t => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = t.type;
        osc.frequency.setValueAtTime(t.freq, startTime);

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + t.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + t.duration);

        startTime += t.duration * 0.75;
      });
    } catch {
      // Audio might be blocked by browser autoplay policy until user interacts
    }
  }

  private getInitialState(): boolean {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(this.SOUND_ENABLED_KEY);
        if (saved !== null) {
          return saved === 'true';
        }
      } catch {
        // ignore
      }
    }
    return true; // default enabled
  }
}

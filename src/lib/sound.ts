/**
 * Small Web Audio sound effects — no audio files, so nothing to load or cache.
 * Sound is disabled globally by the settings toggle via setSoundEnabled().
 */

let enabled = true;
let context: AudioContext | null = null;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

type ToneOptions = {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  sweepTo?: number;
};

function tone({ frequency, duration, type = 'sine', gain = 0.05, delay = 0, sweepTo }: ToneOptions): void {
  const ctx = audioContext();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (sweepTo) oscillator.frequency.exponentialRampToValueAtTime(sweepTo, start + duration);

  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(envelope).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export const sfx = {
  correct() {
    if (!enabled) return;
    tone({ frequency: 660, duration: 0.12, type: 'triangle', gain: 0.05 });
    tone({ frequency: 990, duration: 0.16, type: 'triangle', gain: 0.04, delay: 0.07 });
  },
  wrong() {
    if (!enabled) return;
    tone({ frequency: 220, duration: 0.18, type: 'sawtooth', gain: 0.035, sweepTo: 150 });
  },
  finish() {
    if (!enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, index) =>
      tone({ frequency, duration: 0.22, type: 'triangle', gain: 0.045, delay: index * 0.1 }),
    );
  },
  click() {
    if (!enabled) return;
    tone({ frequency: 420, duration: 0.05, type: 'sine', gain: 0.025 });
  },
};

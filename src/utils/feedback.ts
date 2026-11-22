import { appConfig } from '../config/appConfig';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

/**
 * Reproduce un pitido suave y limpio usando Web Audio API (sin archivos externos).
 */
export function playScanBeep(tone: 'success' | 'new' = 'success'): void {
  if (!appConfig.SOUND_ENABLED) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(tone === 'success' ? 1046.5 : 783.99, now);
    if (tone === 'new') {
      oscillator.frequency.setValueAtTime(1174.66, now + 0.06);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (tone === 'success' ? 0.09 : 0.14));

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + (tone === 'success' ? 0.1 : 0.15));
  } catch {
    // Silenciar si el navegador bloquea audio sin gesto previo
  }
}

/**
 * Emite una vibración corta en dispositivos compatibles.
 */
export function triggerHapticFeedback(pattern: number | number[] = 55): void {
  if (!appConfig.VIBRATION_ENABLED) return;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignorar si el dispositivo no soporta vibración
    }
  }
}

export function triggerScanFeedback(tone: 'success' | 'new' = 'success'): void {
  playScanBeep(tone);
  triggerHapticFeedback(tone === 'success' ? 50 : [40, 40, 60]);
}

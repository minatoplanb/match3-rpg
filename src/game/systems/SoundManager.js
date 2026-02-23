/**
 * SoundManager — Procedural sound effects + BGM via Web Audio API
 * No external audio files needed — all synthesized.
 */

let audioCtx = null;
let _muted = false;

// Load mute preference from localStorage
try {
  _muted = localStorage.getItem('match3rpg_muted') === 'true';
} catch (e) { /* localStorage unavailable */ }

export function isMuted() { return _muted; }

export function toggleMute() {
  _muted = !_muted;
  try { localStorage.setItem('match3rpg_muted', _muted); } catch (e) { /* */ }
  if (_muted) stopBGM();
  return _muted;
}

function getCtx() {
  if (_muted) return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ── HAPTIC FEEDBACK ───────────────────────────────────────

export function haptic(ms = 10) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* unsupported */ }
}

// ── SOUND EFFECTS ─────────────────────────────────────────

export function playGemMatch(comboLevel = 1) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  // Higher pitch for higher combos
  osc.frequency.value = 400 + comboLevel * 80;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

export function playSwap() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.value = 300;
  osc.type = 'triangle';
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

export function playInvalidSwap() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.value = 150;
  osc.type = 'square';
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.12);
}

export function playDamage() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
  osc.type = 'sawtooth';
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

export function playHeal() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  // Two-note arpeggio (C5 → E5)
  [523, 659].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, t + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.15);
    osc.start(t + i * 0.08);
    osc.stop(t + i * 0.08 + 0.15);
  });
}

export function playEnemyHit() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);
  osc.type = 'square';
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

export function playSkill() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  // Rising sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

  osc.start(t);
  osc.stop(t + 0.35);
}

export function playVictory() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  // Victory fanfare: C5 → E5 → G5 → C6
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    const start = t + i * 0.12;
    gain.gain.setValueAtTime(0.15, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + 0.3);
    osc.start(start);
    osc.stop(start + 0.3);
  });
}

export function playDefeat() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  // Descending minor notes
  const notes = [440, 370, 311, 261];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'triangle';
    const start = t + i * 0.2;
    gain.gain.setValueAtTime(0.12, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + 0.4);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}

export function playBossAppear() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  // Ominous low drone + hit
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 60;
  osc.type = 'sawtooth';
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
  osc.start(t);
  osc.stop(t + 0.6);
}

// ── BACKGROUND MUSIC ──────────────────────────────────────

let bgmNodes = null;

export function startBGM() {
  if (bgmNodes || _muted) return;

  const ctx = getCtx();
  if (!ctx) return;

  // Simple ambient loop: alternating low chords
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.04; // Very quiet
  gainNode.connect(ctx.destination);

  // Bass drone
  const bass = ctx.createOscillator();
  bass.type = 'sine';
  bass.frequency.value = 65; // C2

  // Pad
  const pad = ctx.createOscillator();
  pad.type = 'triangle';
  pad.frequency.value = 131; // C3

  // Slow LFO for gentle movement
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.2; // Very slow wobble
  lfoGain.gain.value = 5;
  lfo.connect(lfoGain);
  lfoGain.connect(pad.frequency);

  bass.connect(gainNode);
  pad.connect(gainNode);
  lfo.start();
  bass.start();
  pad.start();

  bgmNodes = { bass, pad, lfo, gainNode };
}

export function stopBGM() {
  if (!bgmNodes) return;
  try {
    bgmNodes.bass.stop();
    bgmNodes.pad.stop();
    bgmNodes.lfo.stop();
  } catch (e) { /* already stopped */ }
  bgmNodes = null;
}

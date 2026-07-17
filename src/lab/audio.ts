export type SoundEventName = "ui.select" | "ui.primaryAction" | "simulation.start" | "simulation.pause" | "simulation.complete" | "agent.activate" | "agent.complete" | "opportunity.generated" | "ranking.updated" | "evidence.warning" | "human.approve" | "human.uncertain" | "human.reject";
export type LabScoreTheme = "lab" | "simulation" | "discovery" | "methodology";

const SCORE_PATHS: Record<LabScoreTheme, string> = {
  lab: "/audio/decoherence-scott-buckley.mp3",
  simulation: "/audio/computations-scott-buckley.mp3",
  discovery: "/audio/the-vision-scott-buckley.mp3",
  methodology: "/audio/adrift-scott-buckley.mp3",
};
const SETTINGS_KEY = "venture-governance-public-lab-audio-v1";
let unlocked = false;
let enabled = false;
let volume = 25;
let scoreTheme: LabScoreTheme = "lab";
let score: HTMLAudioElement | null = null;
let scoreFadeFrame = 0;
let scoreLevel = .68;
let resumeOnVisible = false;

function normalizeVolume(value: number) { return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 25; }
function targetVolume(level = scoreLevel) { return Math.min(.82, Math.max(0, volume / 100 * level)); }
function cancelFade() { window.cancelAnimationFrame(scoreFadeFrame); }

function fadeScore(level: number, duration = 800) {
  scoreLevel = level;
  if (!score) return;
  cancelFade();
  const startVolume = score.volume;
  const target = targetVolume(level);
  const startedAt = performance.now();
  const step = (now: number) => {
    if (!score) return;
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = progress * progress * (3 - 2 * progress);
    score.volume = startVolume + (target - startVolume) * eased;
    if (progress < 1) scoreFadeFrame = window.requestAnimationFrame(step);
  };
  scoreFadeFrame = window.requestAnimationFrame(step);
}

function crossfade(previous: HTMLAudioElement | null, next: HTMLAudioElement, duration = 850) {
  cancelFade();
  const previousVolume = previous?.volume ?? 0;
  const target = targetVolume();
  const startedAt = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = progress * progress * (3 - 2 * progress);
    next.volume = target * eased;
    if (previous) previous.volume = previousVolume * (1 - eased);
    if (progress < 1) scoreFadeFrame = window.requestAnimationFrame(step);
    else if (previous) { previous.pause(); previous.removeAttribute("src"); previous.load(); }
  };
  scoreFadeFrame = window.requestAnimationFrame(step);
}

function startScore() {
  if (!unlocked || !enabled || volume <= 0 || typeof window === "undefined") return;
  if (!score) {
    score = new Audio(SCORE_PATHS[scoreTheme]);
    score.loop = true;
    score.preload = "metadata";
    score.volume = 0;
    void score.play().catch(() => undefined);
    crossfade(null, score);
    return;
  }
  cancelFade();
  score.volume = targetVolume();
  void score.play().catch(() => undefined);
}

function stopScore() { cancelFade(); score?.pause(); }

export function getAudioSettings() {
  if (typeof window !== "undefined") {
    try {
      const stored = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "null") as { enabled?: boolean; volume?: number } | null;
      if (stored) { enabled = stored.enabled !== false; volume = normalizeVolume(Number(stored.volume)); } else enabled = false;
    } catch { enabled = false; }
  } else { enabled = false; volume = 25; }
  return { enabled, volume };
}

export function unlockAudio() { if (typeof window !== "undefined") { unlocked = true; getAudioSettings(); startScore(); } }

export function setAudioSettings(next: { enabled: boolean; volume: number }) {
  enabled = next.enabled;
  volume = normalizeVolume(next.volume);
  if (typeof window !== "undefined") window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ enabled, volume }));
  if (enabled && volume > 0) startScore(); else stopScore();
}

export function setLabScoreTheme(nextTheme: LabScoreTheme) {
  if (nextTheme === scoreTheme) return;
  const previous = score;
  scoreTheme = nextTheme;
  if (!previous || previous.paused || !enabled || volume <= 0) { score = null; return; }
  const next = new Audio(SCORE_PATHS[scoreTheme]);
  next.loop = true;
  next.preload = "metadata";
  next.volume = 0;
  score = next;
  void next.play().catch(() => undefined);
  crossfade(previous, next);
}

export function stopLabAudio() { resumeOnVisible = false; stopScore(); }

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { resumeOnVisible = Boolean(score && !score.paused); stopScore(); }
    else if (resumeOnVisible && enabled) { resumeOnVisible = false; startScore(); }
  });
  window.addEventListener("pagehide", stopLabAudio);
}

export function playSound(eventName: SoundEventName) {
  if (!unlocked || !enabled || volume <= 0 || typeof window === "undefined") return false;
  if (eventName === "simulation.start") fadeScore(.82, 700);
  else if (eventName === "simulation.pause") fadeScore(.42, 500);
  else if (eventName === "simulation.complete") fadeScore(.56, 1400);
  else if (eventName === "opportunity.generated" || eventName === "ranking.updated") fadeScore(.72, 600);
  else if (eventName.startsWith("human.")) fadeScore(.6, 900);
  return true;
}

export type SoundEventName =
  | "ui.select"
  | "ui.primaryAction"
  | "simulation.start"
  | "simulation.pause"
  | "simulation.complete"
  | "agent.activate"
  | "agent.complete"
  | "opportunity.generated"
  | "ranking.updated"
  | "evidence.warning"
  | "human.approve"
  | "human.uncertain"
  | "human.reject";

export type LabScoreTheme = "lab" | "simulation" | "discovery" | "methodology";

const SCORE_PATHS: Record<LabScoreTheme, string> = {
  lab: "https://www.scottbuckley.com.au/library/wp-content/uploads/2022/03/sb_decoherence.mp3",
  simulation: "https://www.scottbuckley.com.au/library/wp-content/uploads/2019/01/sb_computations.mp3",
  discovery: "/audio/the-vision-scott-buckley.mp3",
  methodology: "https://www.scottbuckley.com.au/library/wp-content/uploads/2022/02/AdriftAmongInfiniteStars.mp3",
};
const SETTINGS_KEY = "venture-governance-public-lab-audio-v1";
let unlocked = false;
let enabled = false;
let volume = 25;
let scoreTheme: LabScoreTheme = "lab";
let score: HTMLAudioElement | null = null;
let scoreFadeFrame = 0;

function normalizeVolume(value: number) {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 25;
}

function fadeScore(level: number, duration = 900) {
  if (!score) return;
  window.cancelAnimationFrame(scoreFadeFrame);
  const startVolume = score.volume;
  const target = Math.min(.82, Math.max(0, volume / 100 * level));
  const startedAt = performance.now();
  const step = (now: number) => {
    if (!score) return;
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    score.volume = startVolume + (target - startVolume) * eased;
    if (progress < 1) scoreFadeFrame = window.requestAnimationFrame(step);
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
  }
  void score.play().catch(() => undefined);
  fadeScore(.68, 1400);
}

function stopScore() {
  window.cancelAnimationFrame(scoreFadeFrame);
  score?.pause();
}

export function getAudioSettings() {
  if (typeof window !== "undefined") {
    try {
      const stored = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "null") as { enabled?: boolean; volume?: number } | null;
      if (stored) {
        enabled = stored.enabled !== false;
        volume = normalizeVolume(Number(stored.volume));
      } else enabled = false;
    } catch {
      enabled = false;
    }
  } else {
    enabled = false;
    volume = 25;
  }
  return { enabled, volume };
}

export function unlockAudio() {
  if (typeof window === "undefined") return;
  unlocked = true;
  getAudioSettings();
  startScore();
}

export function setAudioSettings(next: { enabled: boolean; volume: number }) {
  enabled = next.enabled;
  volume = normalizeVolume(next.volume);
  if (typeof window !== "undefined") window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ enabled, volume }));
  if (enabled && volume > 0) startScore(); else stopScore();
}

export function setLabScoreTheme(nextTheme: LabScoreTheme) {
  if (nextTheme === scoreTheme) return;
  const wasPlaying = Boolean(score && !score.paused);
  stopScore();
  score = null;
  scoreTheme = nextTheme;
  if (wasPlaying) startScore();
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

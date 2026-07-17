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

type SoundFile = "hover" | "tick" | "toggle";

const PATHS: Record<SoundFile, string> = {
  hover: "/audio/ui-hover.wav",
  tick: "/audio/tick.mp3",
  toggle: "/audio/ui-toggle.wav",
};

const EVENT_SOUND: Record<SoundEventName, SoundFile> = {
  "ui.select": "hover",
  "ui.primaryAction": "tick",
  "simulation.start": "tick",
  "simulation.pause": "toggle",
  "simulation.complete": "toggle",
  "agent.activate": "hover",
  "agent.complete": "toggle",
  "opportunity.generated": "hover",
  "ranking.updated": "toggle",
  "evidence.warning": "toggle",
  "human.approve": "tick",
  "human.uncertain": "toggle",
  "human.reject": "hover",
};

const SETTINGS_KEY = "venture-governance-public-lab-audio-v1";
const SCORE_PATH = "/audio/discovery-scott-buckley.mp3";
let unlocked = false;
let enabled = false;
let volume = 25;
let lastPlayedAt = 0;
let score: HTMLAudioElement | null = null;
let scoreFadeFrame = 0;
const audio = new Map<SoundFile, HTMLAudioElement>();

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
    score = new Audio(SCORE_PATH);
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
        volume = [0, 25, 50, 75, 100].includes(Number(stored.volume)) ? Number(stored.volume) : 25;
      } else {
        enabled = false;
      }
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
  (Object.keys(PATHS) as SoundFile[]).forEach((name) => {
    if (!audio.has(name)) {
      const element = new Audio(PATHS[name]);
      element.preload = "auto";
      audio.set(name, element);
    }
  });
  startScore();
}

export function setAudioSettings(next: { enabled: boolean; volume: number }) {
  enabled = next.enabled;
  volume = [0, 25, 50, 75, 100].includes(next.volume) ? next.volume : 25;
  if (typeof window !== "undefined") window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ enabled, volume }));
  if (enabled && volume > 0) startScore(); else stopScore();
}

export function playSound(eventName: SoundEventName) {
  if (!unlocked || !enabled || volume <= 0 || typeof window === "undefined") return false;
  if (eventName === "simulation.start") fadeScore(.82, 700);
  else if (eventName === "simulation.pause") fadeScore(.42, 500);
  else if (eventName === "simulation.complete") fadeScore(.56, 1400);
  else if (eventName === "opportunity.generated" || eventName === "ranking.updated") fadeScore(.72, 600);
  else if (eventName.startsWith("human.")) fadeScore(.6, 900);

  const now = performance.now();
  if (now - lastPlayedAt < 90) return false;
  lastPlayedAt = now;
  const name = EVENT_SOUND[eventName];
  const element = audio.get(name);
  if (!element) return false;
  element.volume = Math.min(0.16, volume / 100 * 0.16);
  element.currentTime = 0;
  void element.play().catch(() => undefined);
  return true;
}

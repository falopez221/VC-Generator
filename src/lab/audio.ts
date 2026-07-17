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
let unlocked = false;
let enabled = false;
let volume = 25;
let lastPlayedAt = 0;
const audio = new Map<SoundFile, HTMLAudioElement>();
let ambient: { context: AudioContext; master: GainNode; oscillators: OscillatorNode[]; lfo: OscillatorNode } | null = null;

function stopAmbient() {
  if (!ambient) return;
  const rig = ambient;
  ambient = null;
  const now = rig.context.currentTime;
  rig.master.gain.cancelScheduledValues(now);
  rig.master.gain.setValueAtTime(rig.master.gain.value, now);
  rig.master.gain.linearRampToValueAtTime(0, now + .7);
  window.setTimeout(() => {
    rig.oscillators.forEach((oscillator) => { try { oscillator.stop(); } catch { /* already stopped */ } });
    try { rig.lfo.stop(); } catch { /* already stopped */ }
    void rig.context.close();
  }, 800);
}

function startAmbient() {
  if (!unlocked || !enabled || volume <= 0 || typeof window === "undefined") return;
  if (ambient) {
    ambient.master.gain.linearRampToValueAtTime(volume / 100 * .028, ambient.context.currentTime + 1);
    return;
  }
  const context = new AudioContext();
  const master = context.createGain();
  const filter = context.createBiquadFilter();
  const lfo = context.createOscillator();
  const lfoGain = context.createGain();
  filter.type = "lowpass";
  filter.frequency.value = 360;
  lfo.frequency.value = .028;
  lfoGain.gain.value = .004;
  master.gain.value = 0;
  lfo.connect(lfoGain).connect(master.gain);
  const oscillators = [46.25, 69.38, 92.5].map((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = index === 1 ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = index === 0 ? .5 : index === 1 ? .11 : .04;
    oscillator.connect(gain).connect(filter);
    oscillator.start();
    return oscillator;
  });
  filter.connect(master).connect(context.destination);
  lfo.start();
  master.gain.linearRampToValueAtTime(volume / 100 * .028, context.currentTime + 3.2);
  ambient = { context, master, oscillators, lfo };
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
  }
  else {
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
  startAmbient();
}

export function setAudioSettings(next: { enabled: boolean; volume: number }) {
  enabled = next.enabled;
  volume = [0, 25, 50, 75, 100].includes(next.volume) ? next.volume : 25;
  if (typeof window !== "undefined") window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ enabled, volume }));
  if (enabled && volume > 0) startAmbient(); else stopAmbient();
}

export function playSound(eventName: SoundEventName) {
  if (!unlocked || !enabled || volume <= 0 || typeof window === "undefined") return false;
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

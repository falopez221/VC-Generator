export type SoundEventName = "ui.select" | "ui.primaryAction" | "simulation.start" | "simulation.pause" | "simulation.complete" | "simulation.launch" | "simulation.collision" | "simulation.syntheticCue" | "agent.activate" | "agent.complete" | "opportunity.generated" | "ranking.updated" | "evidence.warning" | "human.approve" | "human.uncertain" | "human.reject";
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
let effectsOnly = false;
let effectContext: AudioContext | null = null;
let scoreRestoreTimer = 0;
const activeSynthSources = new Set<AudioScheduledSourceNode>();
const ORBITAL_LAUNCH_SEQUENCE_PATH = "/audio/orbital-launch-sequence.mp3";
let orbitalLaunchSequence: HTMLAudioElement | null = null;
let restoreScoreAfterOrbitalSequence = false;

function normalizeVolume(value: number) { return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 25; }
function targetVolume(level = scoreLevel) { return Math.min(.82, Math.max(0, volume / 100 * level)); }
function effectVolume(level = .86) { return Math.min(.82, Math.max(0, volume / 100 * level)); }
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
  if (effectsOnly || !unlocked || !enabled || volume <= 0 || typeof window === "undefined") return;
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

function updateOrbitalLaunchSequenceVolume() {
  if (orbitalLaunchSequence) orbitalLaunchSequence.volume = effectVolume(.9);
}

function restoreScoreAfterSequence() {
  const shouldRestore = restoreScoreAfterOrbitalSequence;
  restoreScoreAfterOrbitalSequence = false;
  if (shouldRestore && unlocked && enabled && volume > 0) startScore();
}

export function playOrbitalLaunchSequence(fromSeconds = 0) {
  if (typeof window === "undefined" || !unlocked || !enabled || volume <= 0) return false;
  const sequenceWasPlaying = Boolean(orbitalLaunchSequence && !orbitalLaunchSequence.paused && !orbitalLaunchSequence.ended);
  if (!sequenceWasPlaying) restoreScoreAfterOrbitalSequence = Boolean(score && !score.paused);
  stopScore();
  if (!orbitalLaunchSequence) {
    orbitalLaunchSequence = new Audio(ORBITAL_LAUNCH_SEQUENCE_PATH);
    orbitalLaunchSequence.preload = "auto";
    orbitalLaunchSequence.addEventListener("ended", () => {
      if (orbitalLaunchSequence) orbitalLaunchSequence.currentTime = 0;
      restoreScoreAfterSequence();
    });
  }
  updateOrbitalLaunchSequenceVolume();
  const requestedTime = Number.isFinite(fromSeconds) ? Math.max(0, fromSeconds) : 0;
  try {
    orbitalLaunchSequence.currentTime = Number.isFinite(orbitalLaunchSequence.duration)
      ? Math.min(requestedTime, Math.max(0, orbitalLaunchSequence.duration - .01))
      : requestedTime;
  } catch { /* The browser will retain the default position until metadata is available. */ }
  void orbitalLaunchSequence.play().catch(() => restoreScoreAfterSequence());
  return true;
}

export function pauseOrbitalLaunchSequence() {
  if (!orbitalLaunchSequence || orbitalLaunchSequence.paused) return;
  orbitalLaunchSequence.pause();
  restoreScoreAfterSequence();
}

export function stopOrbitalLaunchSequence() {
  if (orbitalLaunchSequence) {
    orbitalLaunchSequence.pause();
    try { orbitalLaunchSequence.currentTime = 0; } catch { /* Metadata may not be ready yet. */ }
  }
  restoreScoreAfterSequence();
}

function getEffectContext() {
  if (typeof window === "undefined") return null;
  effectContext ??= new AudioContext();
  return effectContext;
}

function createDeterministicNoise(context: AudioContext, duration: number, seed: number) {
  const frameCount = Math.max(1, Math.ceil(context.sampleRate * duration));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  let state = seed >>> 0;
  for (let index = 0; index < frameCount; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    data[index] = (state / 0xffffffff) * 2 - 1;
  }
  return buffer;
}

function trackSynthSource(source: AudioScheduledSourceNode) {
  activeSynthSources.add(source);
  source.addEventListener("ended", () => activeSynthSources.delete(source), { once: true });
}

function stopSynthEffects() {
  for (const source of activeSynthSources) {
    try { source.stop(); } catch { /* Source may already have ended. */ }
  }
  activeSynthSources.clear();
  if (effectContext?.state === "running") void effectContext.suspend().catch(() => undefined);
}

function synthesizeLaunch(context: AudioContext) {
  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(.0001, now);
  master.gain.exponentialRampToValueAtTime(Math.max(.0001, effectVolume(.48)), now + .07);
  master.gain.exponentialRampToValueAtTime(.0001, now + .82);
  master.connect(context.destination);

  const thrust = context.createOscillator();
  const thrustGain = context.createGain();
  thrust.type = "sawtooth";
  thrust.frequency.setValueAtTime(74, now);
  thrust.frequency.exponentialRampToValueAtTime(210, now + .72);
  thrustGain.gain.setValueAtTime(.22, now);
  thrustGain.gain.exponentialRampToValueAtTime(.0001, now + .8);
  thrust.connect(thrustGain).connect(master);

  const noise = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const noiseGain = context.createGain();
  noise.buffer = createDeterministicNoise(context, .84, 0x5a17c9e3);
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(320, now);
  filter.frequency.exponentialRampToValueAtTime(1450, now + .7);
  filter.Q.value = .72;
  noiseGain.gain.setValueAtTime(.7, now);
  noiseGain.gain.exponentialRampToValueAtTime(.0001, now + .82);
  noise.connect(filter).connect(noiseGain).connect(master);

  trackSynthSource(thrust);
  trackSynthSource(noise);
  thrust.start(now);
  thrust.stop(now + .84);
  noise.start(now);
  noise.stop(now + .84);
}

function synthesizeCollision(context: AudioContext) {
  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(Math.max(.0001, effectVolume(.68)), now);
  master.gain.exponentialRampToValueAtTime(.0001, now + .58);
  master.connect(context.destination);

  const impact = context.createBufferSource();
  const impactFilter = context.createBiquadFilter();
  impact.buffer = createDeterministicNoise(context, .6, 0xc0111de);
  impactFilter.type = "lowpass";
  impactFilter.frequency.setValueAtTime(2200, now);
  impactFilter.frequency.exponentialRampToValueAtTime(160, now + .5);
  impactFilter.Q.value = 1.2;
  impact.connect(impactFilter).connect(master);

  const body = context.createOscillator();
  const bodyGain = context.createGain();
  body.type = "sine";
  body.frequency.setValueAtTime(96, now);
  body.frequency.exponentialRampToValueAtTime(38, now + .48);
  bodyGain.gain.setValueAtTime(.58, now);
  bodyGain.gain.exponentialRampToValueAtTime(.0001, now + .55);
  body.connect(bodyGain).connect(master);

  trackSynthSource(impact);
  trackSynthSource(body);
  impact.start(now);
  impact.stop(now + .6);
  body.start(now);
  body.stop(now + .58);
}

function playSynthEffect(kind: "launch" | "collision") {
  const context = getEffectContext();
  if (!context) return;
  const play = () => kind === "launch" ? synthesizeLaunch(context) : synthesizeCollision(context);
  if (context.state === "suspended") void context.resume().then(play).catch(() => undefined);
  else play();
}

export function getAudioSettings() {
  if (typeof window !== "undefined") {
    try {
      const stored = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "null") as { enabled?: boolean; volume?: number } | null;
      if (stored) { enabled = stored.enabled !== false; volume = normalizeVolume(Number(stored.volume)); } else enabled = false;
    } catch { enabled = false; }
  } else { enabled = false; volume = 25; }
  return { enabled, volume };
}

export function unlockAudio() { if (typeof window !== "undefined") { unlocked = true; if (!effectsOnly) getAudioSettings(); startScore(); } }

export function applyInterfaceAudioSettings(next: { enabled: boolean; volume: number }) {
  effectsOnly = true;
  enabled = next.enabled;
  volume = normalizeVolume(next.volume);
  updateOrbitalLaunchSequenceVolume();
  stopScore();
  if (!enabled || volume <= 0) { stopSynthEffects(); stopOrbitalLaunchSequence(); }
  else if (unlocked && effectContext?.state === "suspended") void effectContext.resume().catch(() => undefined);
}

export function releaseInterfaceAudioSettings() {
  effectsOnly = false;
  getAudioSettings();
}

export function setAudioSettings(next: { enabled: boolean; volume: number }) {
  enabled = next.enabled;
  volume = normalizeVolume(next.volume);
  updateOrbitalLaunchSequenceVolume();
  if (typeof window !== "undefined") window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ enabled, volume }));
  if (enabled && volume > 0) {
    if (!orbitalLaunchSequence || orbitalLaunchSequence.paused) startScore();
  } else {
    stopScore();
    stopOrbitalLaunchSequence();
  }
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

export function stopLabAudio() {
  resumeOnVisible = false;
  stopOrbitalLaunchSequence();
  stopScore();
  stopOrbitalLaunchSequence();
  window.clearTimeout(scoreRestoreTimer);
  stopSynthEffects();
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { resumeOnVisible = Boolean(score && !score.paused); stopScore(); }
    else if (resumeOnVisible && enabled) { resumeOnVisible = false; startScore(); }
  });
  window.addEventListener("pagehide", stopLabAudio);
}

export function playSound(eventName: SoundEventName) {
  if (!unlocked || !enabled || volume <= 0 || typeof window === "undefined") return false;
  if (eventName === "simulation.launch") {
    playSynthEffect("launch");
    return true;
  }
  if (eventName === "simulation.collision" || eventName === "simulation.syntheticCue") {
    playSynthEffect("collision");
    fadeScore(.28, 90);
    window.clearTimeout(scoreRestoreTimer);
    scoreRestoreTimer = window.setTimeout(() => fadeScore(.56, 620), 460);
    return true;
  }
  if (eventName === "simulation.start") fadeScore(.82, 700);
  else if (eventName === "simulation.pause") fadeScore(.42, 500);
  else if (eventName === "simulation.complete") fadeScore(.56, 1400);
  else if (eventName === "opportunity.generated" || eventName === "ranking.updated") fadeScore(.72, 600);
  else if (eventName.startsWith("human.")) fadeScore(.6, 900);
  return true;
}

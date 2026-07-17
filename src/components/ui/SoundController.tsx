"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SoundFile = "hover" | "tick" | "toggle" | "swosh";
export type InterfaceSoundEvent = "ui.hover" | "ui.tick" | "ui.toggle" | "human.input" | "agent.pulse" | "stage.complete" | "opportunity.prioritized";

const SOUND_PATHS: Record<SoundFile, string> = {
  hover: "/audio/ui-hover.wav",
  tick: "/audio/tick.mp3",
  toggle: "/audio/ui-toggle.wav",
  swosh: "/audio/swosh.mp3",
};

const SOUND_VOLUMES: Record<SoundFile, number> = { hover: 0.05, tick: 0.1, toggle: 0.08, swosh: 0.11 };
const EVENT_SOUND: Record<InterfaceSoundEvent, SoundFile> = {
  "ui.hover": "hover",
  "ui.tick": "tick",
  "ui.toggle": "toggle",
  "human.input": "swosh",
  "agent.pulse": "hover",
  "stage.complete": "toggle",
  "opportunity.prioritized": "tick",
};

const INTERACTIVE_SELECTOR = "a, button, summary, input[type='range'], [role='button']";
const STORAGE_KEY = "venture-governance-sound";
const PLAY_EVENT = "venture-governance:sound-play";
const SETTINGS_EVENT = "venture-governance:sound-settings";
export const INTERFACE_SOUND_STATE_EVENT = "venture-governance:sound-state";

export function readInterfaceSoundSettings() {
  if (typeof window === "undefined") return { enabled: false, volume: 25 };
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "on" || stored === "off") return { enabled: stored === "on", volume: 25 };
  try {
    const parsed = JSON.parse(stored ?? "null") as { enabled?: boolean; volume?: number } | null;
    const volume = [0, 25, 50, 75, 100].includes(Number(parsed?.volume)) ? Number(parsed?.volume) : 25;
    return { enabled: parsed?.enabled === true, volume };
  } catch {
    return { enabled: false, volume: 25 };
  }
}

export function requestInterfaceSound(eventName: InterfaceSoundEvent) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: { eventName } }));
}

export function requestInterfaceSoundSettings(settings: { enabled: boolean; volume: number }) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }));
}

export function SoundController() {
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(25);
  const enabledRef = useRef(false);
  const volumeRef = useRef(25);
  const unlockedRef = useRef(false);
  const soundsRef = useRef<Partial<Record<SoundFile, HTMLAudioElement>>>({});
  const lastHoverRef = useRef(0);
  const ambientRef = useRef<{ context: AudioContext; master: GainNode; oscillators: OscillatorNode[]; lfo: OscillatorNode } | null>(null);

  const ensureSounds = useCallback(() => {
    if (Object.keys(soundsRef.current).length > 0) return;
    soundsRef.current = Object.fromEntries((Object.keys(SOUND_PATHS) as SoundFile[]).map((name) => {
      const audio = new Audio(SOUND_PATHS[name]);
      audio.preload = "auto";
      return [name, audio];
    }));
  }, []);

  const play = useCallback((eventName: InterfaceSoundEvent) => {
    if (!unlockedRef.current || !enabledRef.current || volumeRef.current <= 0) return;
    ensureSounds();
    const file = EVENT_SOUND[eventName];
    const sound = soundsRef.current[file];
    if (!sound) return;
    sound.volume = SOUND_VOLUMES[file] * volumeRef.current / 100;
    sound.currentTime = 0;
    void sound.play().catch(() => undefined);
  }, [ensureSounds]);

  const stopAmbient = useCallback(() => {
    const rig = ambientRef.current;
    if (!rig) return;
    ambientRef.current = null;
    const now = rig.context.currentTime;
    rig.master.gain.cancelScheduledValues(now);
    rig.master.gain.setValueAtTime(rig.master.gain.value, now);
    rig.master.gain.linearRampToValueAtTime(0, now + .8);
    window.setTimeout(() => {
      rig.oscillators.forEach((oscillator) => { try { oscillator.stop(); } catch { /* already stopped */ } });
      try { rig.lfo.stop(); } catch { /* already stopped */ }
      void rig.context.close();
    }, 900);
  }, []);

  const startAmbient = useCallback((requestedVolume: number) => {
    if (!unlockedRef.current || requestedVolume <= 0) return;
    if (ambientRef.current) {
      const now = ambientRef.current.context.currentTime;
      ambientRef.current.master.gain.linearRampToValueAtTime(requestedVolume / 100 * .035, now + 1.2);
      return;
    }
    const context = new AudioContext();
    const master = context.createGain();
    const filter = context.createBiquadFilter();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = .4;
    master.gain.value = 0;
    lfo.frequency.value = .035;
    lfoGain.gain.value = .006;
    lfo.connect(lfoGain).connect(master.gain);
    const oscillators = [55, 82.5, 110].map((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 1 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.value = index === 0 ? .48 : index === 1 ? .12 : .045;
      oscillator.connect(gain).connect(filter);
      oscillator.start();
      return oscillator;
    });
    filter.connect(master).connect(context.destination);
    lfo.start();
    master.gain.linearRampToValueAtTime(requestedVolume / 100 * .035, context.currentTime + 3.5);
    ambientRef.current = { context, master, oscillators, lfo };
  }, []);

  const applySettings = useCallback((next: { enabled: boolean; volume: number }, preview = false) => {
    const safeVolume = [0, 25, 50, 75, 100].includes(next.volume) ? next.volume : 25;
    enabledRef.current = next.enabled;
    volumeRef.current = safeVolume;
    setEnabled(next.enabled);
    setVolume(safeVolume);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: next.enabled, volume: safeVolume }));
    window.dispatchEvent(new CustomEvent(INTERFACE_SOUND_STATE_EVENT, { detail: { enabled: next.enabled, volume: safeVolume } }));
    if (next.enabled && safeVolume > 0) startAmbient(safeVolume); else stopAmbient();
    if (preview && next.enabled) queueMicrotask(() => play("ui.toggle"));
  }, [play, startAmbient, stopAmbient]);

  useEffect(() => {
    const initial = readInterfaceSoundSettings();
    enabledRef.current = initial.enabled;
    volumeRef.current = initial.volume;
    queueMicrotask(() => { setEnabled(initial.enabled); setVolume(initial.volume); window.dispatchEvent(new CustomEvent(INTERFACE_SOUND_STATE_EVENT, { detail: initial })); });

    const unlock = () => { unlockedRef.current = true; if (enabledRef.current) { ensureSounds(); startAmbient(volumeRef.current); } };
    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !enabledRef.current) return;
      const target = event.target instanceof Element ? event.target.closest(INTERACTIVE_SELECTOR) : null;
      if (!target || target.hasAttribute("aria-disabled") || target.classList.contains("sound-toggle") || target.closest("[data-sound-control]")) return;
      if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
      const now = performance.now();
      if (now - lastHoverRef.current < 70) return;
      lastHoverRef.current = now;
      play("ui.hover");
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest(INTERACTIVE_SELECTOR) : null;
      if (!target || target.classList.contains("sound-toggle") || target.closest("[data-sound-control]") || target.hasAttribute("aria-disabled") || target.matches("input[type='range']")) return;
      play(target.matches("summary, [aria-pressed], [aria-expanded]") ? "ui.toggle" : "ui.tick");
    };
    const onChange = (event: Event) => { const target = event.target; if (target instanceof HTMLInputElement && target.type === "range") play("ui.toggle"); };
    const onPlayRequest = (event: Event) => play((event as CustomEvent<{ eventName: InterfaceSoundEvent }>).detail.eventName);
    const onSettingsRequest = (event: Event) => applySettings((event as CustomEvent<{ enabled: boolean; volume: number }>).detail, true);

    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("click", onClick);
    document.addEventListener("change", onChange);
    window.addEventListener(PLAY_EVENT, onPlayRequest);
    window.addEventListener(SETTINGS_EVENT, onSettingsRequest);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("click", onClick);
      document.removeEventListener("change", onChange);
      window.removeEventListener(PLAY_EVENT, onPlayRequest);
      window.removeEventListener(SETTINGS_EVENT, onSettingsRequest);
      Object.values(soundsRef.current).forEach((sound) => sound?.pause());
      soundsRef.current = {};
      stopAmbient();
    };
  }, [applySettings, ensureSounds, play, startAmbient, stopAmbient]);

  const toggleSound = () => applySettings({ enabled: !enabledRef.current, volume }, true);

  return <div className="sound-control-cluster"><button className={enabled ? "sound-toggle is-on" : "sound-toggle"} type="button" aria-pressed={enabled} aria-label={enabled ? "Mute original ambient sound" : "Enable original ambient sound"} title={enabled ? `Original ambient sound enabled at ${volume}%` : "Enable original ambient sound"} onClick={toggleSound}><span className="sound-glyph" aria-hidden="true">♪</span><span className="sound-label">{enabled ? "AUDIO ON" : "ENABLE SOUND"}</span></button><label className="sound-volume"><span className="sr-only">Ambient volume</span><select value={volume} onChange={(event) => applySettings({ enabled, volume: Number(event.target.value) }, enabled)} aria-label="Ambient volume"><option value="0">0%</option><option value="25">25%</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option></select></label></div>;
}

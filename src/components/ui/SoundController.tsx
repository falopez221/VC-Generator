"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type InterfaceSoundEvent = "ui.hover" | "ui.tick" | "ui.toggle" | "human.input" | "agent.pulse" | "stage.complete" | "opportunity.prioritized";
const SCORE_PATH = "/audio/the-vision-scott-buckley.mp3";
const STORAGE_KEY = "venture-governance-sound";
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
  void eventName;
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
  const scoreRef = useRef<HTMLAudioElement | null>(null);

  const stopScore = useCallback(() => {
    scoreRef.current?.pause();
  }, []);

  const startScore = useCallback((requestedVolume: number) => {
    if (!unlockedRef.current || requestedVolume <= 0) return;
    if (!scoreRef.current) {
      const score = new Audio(SCORE_PATH);
      score.loop = true;
      score.preload = "metadata";
      scoreRef.current = score;
    }
    scoreRef.current.volume = Math.min(.72, requestedVolume / 100 * .68);
    void scoreRef.current.play().catch(() => undefined);
  }, []);

  const applySettings = useCallback((next: { enabled: boolean; volume: number }, preview = false) => {
    const safeVolume = [0, 25, 50, 75, 100].includes(next.volume) ? next.volume : 25;
    enabledRef.current = next.enabled;
    volumeRef.current = safeVolume;
    setEnabled(next.enabled);
    setVolume(safeVolume);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: next.enabled, volume: safeVolume }));
    window.dispatchEvent(new CustomEvent(INTERFACE_SOUND_STATE_EVENT, { detail: { enabled: next.enabled, volume: safeVolume } }));
    if (next.enabled && safeVolume > 0) startScore(safeVolume); else stopScore();
    void preview;
  }, [startScore, stopScore]);

  useEffect(() => {
    const initial = readInterfaceSoundSettings();
    enabledRef.current = initial.enabled;
    volumeRef.current = initial.volume;
    queueMicrotask(() => { setEnabled(initial.enabled); setVolume(initial.volume); window.dispatchEvent(new CustomEvent(INTERFACE_SOUND_STATE_EVENT, { detail: initial })); });

    const unlock = () => { unlockedRef.current = true; if (enabledRef.current) startScore(volumeRef.current); };
    const onSettingsRequest = (event: Event) => applySettings((event as CustomEvent<{ enabled: boolean; volume: number }>).detail, true);

    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    window.addEventListener(SETTINGS_EVENT, onSettingsRequest);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
      window.removeEventListener(SETTINGS_EVENT, onSettingsRequest);
      stopScore();
      scoreRef.current = null;
    };
  }, [applySettings, startScore, stopScore]);

  const toggleSound = () => applySettings({ enabled: !enabledRef.current, volume }, true);

  return <div className="sound-control-cluster"><button className={enabled ? "sound-toggle is-on" : "sound-toggle"} type="button" aria-pressed={enabled} aria-label={enabled ? "Mute cinematic score" : "Enable cinematic score"} title={enabled ? `Cinematic score enabled at ${volume}%` : "Enable cinematic score"} onClick={toggleSound}><span className="sound-glyph" aria-hidden="true">♪</span><span className="sound-label">{enabled ? "SCORE ON" : "ENABLE SCORE"}</span></button><label className="sound-volume"><span className="sr-only">Score volume</span><select value={volume} onChange={(event) => applySettings({ enabled, volume: Number(event.target.value) }, enabled)} aria-label="Score volume"><option value="0">0%</option><option value="25">25%</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option></select></label></div>;
}

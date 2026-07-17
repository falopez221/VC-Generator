"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type InterfaceSoundEvent = "ui.hover" | "ui.tick" | "ui.toggle" | "human.input" | "agent.pulse" | "stage.complete" | "opportunity.prioritized";
export type ScoreTheme = "system" | "applications" | "workspace";

const SCORE_PATHS: Record<ScoreTheme, string> = {
  system: "/audio/the-vision-scott-buckley.mp3",
  applications: "https://www.scottbuckley.com.au/library/wp-content/uploads/2022/03/sb_decoherence.mp3",
  workspace: "https://www.scottbuckley.com.au/library/wp-content/uploads/2019/01/sb_computations.mp3",
};
const STORAGE_KEY = "venture-governance-sound";
const SETTINGS_EVENT = "venture-governance:sound-settings";
export const INTERFACE_SOUND_STATE_EVENT = "venture-governance:sound-state";

function normalizeVolume(value: number) {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 25;
}

export function readInterfaceSoundSettings() {
  if (typeof window === "undefined") return { enabled: false, volume: 25 };
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "on" || stored === "off") return { enabled: stored === "on", volume: 25 };
  try {
    const parsed = JSON.parse(stored ?? "null") as { enabled?: boolean; volume?: number } | null;
    return { enabled: parsed?.enabled === true, volume: normalizeVolume(Number(parsed?.volume)) };
  } catch {
    return { enabled: false, volume: 25 };
  }
}

export function requestInterfaceSound(eventName: InterfaceSoundEvent) { void eventName; }

export function requestInterfaceSoundSettings(settings: { enabled: boolean; volume: number }) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }));
}

export function SoundController({ theme = "system" }: { theme?: ScoreTheme }) {
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(25);
  const enabledRef = useRef(false);
  const volumeRef = useRef(25);
  const unlockedRef = useRef(false);
  const scoreRef = useRef<HTMLAudioElement | null>(null);
  const activeThemeRef = useRef<ScoreTheme>(theme);

  const stopScore = useCallback(() => scoreRef.current?.pause(), []);
  const startScore = useCallback((requestedVolume: number) => {
    if (!unlockedRef.current || requestedVolume <= 0) return;
    if (!scoreRef.current) {
      const score = new Audio(SCORE_PATHS[theme]);
      score.loop = true;
      score.preload = "metadata";
      scoreRef.current = score;
    }
    scoreRef.current.volume = Math.min(.72, requestedVolume / 100 * .68);
    void scoreRef.current.play().catch(() => undefined);
  }, [theme]);

  const applySettings = useCallback((next: { enabled: boolean; volume: number }) => {
    const safeVolume = normalizeVolume(next.volume);
    enabledRef.current = next.enabled;
    volumeRef.current = safeVolume;
    setEnabled(next.enabled);
    setVolume(safeVolume);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: next.enabled, volume: safeVolume }));
    window.dispatchEvent(new CustomEvent(INTERFACE_SOUND_STATE_EVENT, { detail: { enabled: next.enabled, volume: safeVolume } }));
    if (next.enabled && safeVolume > 0) startScore(safeVolume); else stopScore();
  }, [startScore, stopScore]);

  useEffect(() => {
    const initial = readInterfaceSoundSettings();
    enabledRef.current = initial.enabled;
    volumeRef.current = initial.volume;
    queueMicrotask(() => { setEnabled(initial.enabled); setVolume(initial.volume); window.dispatchEvent(new CustomEvent(INTERFACE_SOUND_STATE_EVENT, { detail: initial })); });
    const unlock = () => { unlockedRef.current = true; if (enabledRef.current) startScore(volumeRef.current); };
    const onSettingsRequest = (event: Event) => applySettings((event as CustomEvent<{ enabled: boolean; volume: number }>).detail);
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

  useEffect(() => {
    if (activeThemeRef.current === theme) return;
    activeThemeRef.current = theme;
    const wasPlaying = Boolean(scoreRef.current && !scoreRef.current.paused);
    scoreRef.current?.pause();
    scoreRef.current = null;
    if (wasPlaying && enabledRef.current) startScore(volumeRef.current);
  }, [startScore, theme]);

  const toggleSound = () => applySettings({ enabled: !enabledRef.current, volume });

  return <div className="sound-control-cluster"><button className={enabled ? "sound-toggle is-on" : "sound-toggle"} type="button" aria-pressed={enabled} aria-label={enabled ? "Mute cinematic score" : "Enable cinematic score"} title={enabled ? `Cinematic score enabled at ${volume}%` : "Enable cinematic score"} onClick={toggleSound}><span className="sound-glyph" aria-hidden="true">♪</span><span className="sound-label">{enabled ? "SCORE ON" : "ENABLE SCORE"}</span></button><label className="sound-volume"><span className="sr-only">Score volume</span><input type="range" min="0" max="100" step="1" value={volume} onChange={(event) => applySettings({ enabled, volume: Number(event.target.value) })} aria-label="Score volume" /><output aria-hidden="true">{volume}%</output></label></div>;
}

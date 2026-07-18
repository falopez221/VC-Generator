"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type InterfaceSoundEvent = "ui.hover" | "ui.tick" | "ui.toggle" | "human.input" | "agent.pulse" | "stage.complete" | "opportunity.prioritized";
export type ScoreTheme = "system" | "applications" | "workspace";

const SCORE_PATHS: Record<ScoreTheme, string> = {
  system: "/audio/the-vision-scott-buckley.mp3",
  applications: "/audio/decoherence-scott-buckley.mp3",
  workspace: "/audio/computations-scott-buckley.mp3",
};
const STORAGE_KEY = "venture-governance-sound";
const SETTINGS_EVENT = "venture-governance:sound-settings";
export const INTERFACE_SOUND_STATE_EVENT = "venture-governance:sound-state";

function normalizeVolume(value: number) { return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 25; }

export function readInterfaceSoundSettings() {
  if (typeof window === "undefined") return { enabled: false, volume: 25 };
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "on" || stored === "off") return { enabled: stored === "on", volume: 25 };
  try {
    const parsed = JSON.parse(stored ?? "null") as { enabled?: boolean; volume?: number } | null;
    return { enabled: parsed?.enabled === true, volume: normalizeVolume(Number(parsed?.volume)) };
  } catch { return { enabled: false, volume: 25 }; }
}

export function requestInterfaceSound(eventName: InterfaceSoundEvent) { void eventName; }
export function requestInterfaceSoundSettings(settings: { enabled: boolean; volume: number }) { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings })); }

export function SoundController({ theme = "system" }: { theme?: ScoreTheme }) {
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(25);
  const enabledRef = useRef(false);
  const volumeRef = useRef(25);
  const unlockedRef = useRef(false);
  const resumeOnVisibleRef = useRef(false);
  const scoreRef = useRef<HTMLAudioElement | null>(null);
  const activeThemeRef = useRef<ScoreTheme>(theme);
  const fadeFrameRef = useRef(0);

  const targetVolume = useCallback((requestedVolume: number) => Math.min(.72, normalizeVolume(requestedVolume) / 100 * .68), []);
  const cancelFade = useCallback(() => window.cancelAnimationFrame(fadeFrameRef.current), []);
  const stopScore = useCallback(() => { cancelFade(); scoreRef.current?.pause(); }, [cancelFade]);

  const crossfade = useCallback((previous: HTMLAudioElement | null, next: HTMLAudioElement, target: number) => {
    cancelFade();
    const previousVolume = previous?.volume ?? 0;
    const startedAt = performance.now();
    const frame = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 850);
      const eased = progress * progress * (3 - 2 * progress);
      next.volume = target * eased;
      if (previous) previous.volume = previousVolume * (1 - eased);
      if (progress < 1) fadeFrameRef.current = window.requestAnimationFrame(frame);
      else if (previous) { previous.pause(); previous.removeAttribute("src"); previous.load(); }
    };
    fadeFrameRef.current = window.requestAnimationFrame(frame);
  }, [cancelFade]);

  const startScore = useCallback((requestedVolume: number) => {
    if (!unlockedRef.current || requestedVolume <= 0) return;
    const target = targetVolume(requestedVolume);
    if (!scoreRef.current) {
      const score = new Audio(SCORE_PATHS[activeThemeRef.current]);
      score.loop = true;
      score.preload = "metadata";
      score.volume = 0;
      scoreRef.current = score;
      void score.play().catch(() => undefined);
      crossfade(null, score, target);
      return;
    }
    cancelFade();
    scoreRef.current.volume = target;
    void scoreRef.current.play().catch(() => undefined);
  }, [cancelFade, crossfade, targetVolume]);

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
    const onVisibilityChange = () => {
      if (document.hidden) { resumeOnVisibleRef.current = Boolean(scoreRef.current && !scoreRef.current.paused); stopScore(); }
      else if (resumeOnVisibleRef.current && enabledRef.current) { resumeOnVisibleRef.current = false; startScore(volumeRef.current); }
    };
    const onPageHide = () => { resumeOnVisibleRef.current = false; stopScore(); };
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener(SETTINGS_EVENT, onSettingsRequest);
    return () => { document.removeEventListener("pointerdown", unlock); document.removeEventListener("keydown", unlock); document.removeEventListener("visibilitychange", onVisibilityChange); window.removeEventListener("pagehide", onPageHide); window.removeEventListener(SETTINGS_EVENT, onSettingsRequest); stopScore(); scoreRef.current = null; };
  }, [applySettings, startScore, stopScore]);

  useEffect(() => {
    if (activeThemeRef.current === theme) return;
    activeThemeRef.current = theme;
    const previous = scoreRef.current;
    if (!previous || previous.paused || !enabledRef.current || volumeRef.current <= 0) { scoreRef.current = null; return; }
    const next = new Audio(SCORE_PATHS[theme]);
    next.loop = true;
    next.preload = "metadata";
    next.volume = 0;
    scoreRef.current = next;
    void next.play().catch(() => undefined);
    crossfade(previous, next, targetVolume(volumeRef.current));
  }, [crossfade, targetVolume, theme]);

  return <div className="sound-control-cluster"><button className={enabled ? "sound-toggle is-on" : "sound-toggle"} type="button" aria-pressed={enabled} aria-label={enabled ? "Mute cinematic score" : "Enable cinematic score"} title={enabled ? `Cinematic score enabled at ${volume}%` : "Enable cinematic score"} onClick={() => applySettings({ enabled: !enabledRef.current, volume })}><span className="sound-glyph" aria-hidden="true">♪</span><span className="sound-label">{enabled ? "SCORE ON" : "ENABLE SCORE"}</span></button><label className="sound-volume"><span className="sr-only">Score volume</span><input type="range" min="0" max="100" step="1" value={volume} onChange={(event) => applySettings({ enabled, volume: Number(event.target.value) })} aria-label="Score volume" /><output aria-hidden="true">{volume}%</output></label></div>;
}

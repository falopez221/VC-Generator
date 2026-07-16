"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SoundName = "hover" | "tick" | "toggle";

const SOUND_PATHS: Record<SoundName, string> = {
  hover: "/audio/ui-hover.wav",
  tick: "/audio/tick.mp3",
  toggle: "/audio/ui-toggle.wav",
};

const SOUND_VOLUMES: Record<SoundName, number> = {
  hover: 0.045,
  tick: 0.09,
  toggle: 0.08,
};

const INTERACTIVE_SELECTOR = "a, button, summary, input[type='range'], [role='button']";
const STORAGE_KEY = "venture-governance-sound";

export function SoundController() {
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true);
  const soundsRef = useRef<Partial<Record<SoundName, HTMLAudioElement>>>({});
  const lastHoverRef = useRef(0);

  const play = useCallback((name: SoundName) => {
    if (!enabledRef.current) return;
    const sound = soundsRef.current[name];
    if (!sound) return;
    sound.currentTime = 0;
    void sound.play().catch(() => undefined);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initialEnabled = stored !== "off";
    enabledRef.current = initialEnabled;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setEnabled(initialEnabled);
    });

    soundsRef.current = Object.fromEntries(
      (Object.keys(SOUND_PATHS) as SoundName[]).map((name) => {
        const audio = new Audio(SOUND_PATHS[name]);
        audio.preload = "auto";
        audio.volume = SOUND_VOLUMES[name];
        return [name, audio];
      }),
    );

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !enabledRef.current) return;
      const target = event.target instanceof Element ? event.target.closest(INTERACTIVE_SELECTOR) : null;
      if (!target || target.hasAttribute("aria-disabled")) return;
      if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
      const now = performance.now();
      if (now - lastHoverRef.current < 70) return;
      lastHoverRef.current = now;
      play("hover");
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest(INTERACTIVE_SELECTOR) : null;
      if (!target || target.classList.contains("sound-toggle") || target.hasAttribute("aria-disabled")) return;
      if (target.matches("input[type='range']")) return;
      const isStateChange = target.matches("summary, [aria-pressed], [aria-expanded]");
      play(isStateChange ? "toggle" : "tick");
    };

    const onChange = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.type === "range") play("toggle");
    };

    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("click", onClick);
    document.addEventListener("change", onChange);
    return () => {
      cancelled = true;
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("click", onClick);
      document.removeEventListener("change", onChange);
      Object.values(soundsRef.current).forEach((sound) => sound?.pause());
      soundsRef.current = {};
    };
  }, [play]);

  const toggleSound = () => {
    if (enabledRef.current) {
      play("toggle");
      enabledRef.current = false;
      setEnabled(false);
      window.localStorage.setItem(STORAGE_KEY, "off");
      return;
    }

    enabledRef.current = true;
    setEnabled(true);
    window.localStorage.setItem(STORAGE_KEY, "on");
    play("toggle");
  };

  return (
    <button
      className={enabled ? "sound-toggle is-on" : "sound-toggle"}
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? "Silenciar sonidos de interfaz" : "Activar sonidos de interfaz"}
      title={enabled ? "Sonido activado" : "Sonido desactivado"}
      onClick={toggleSound}
    >
      <span className="sound-glyph" aria-hidden="true">♪</span>
      <span className="sound-label">{enabled ? "AUDIO ON" : "AUDIO OFF"}</span>
    </button>
  );
}

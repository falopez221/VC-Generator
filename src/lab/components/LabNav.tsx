"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAudioSettings, playSound, setAudioSettings, unlockAudio } from "../audio.ts";
import { openLabTour } from "./LabTour.tsx";

const links = [
  ["Home", "/"],
  ["Lab", "/lab"],
  ["Demo", "/lab/demo"],
  ["Methodology", "/lab/methodology"],
] as const;

export function LabNav() {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(25);

  useEffect(() => {
    const settings = getAudioSettings();
    queueMicrotask(() => {
      setEnabled(settings.enabled);
      setVolume(settings.volume);
    });
  }, []);

  const updateAudio = (nextEnabled: boolean, nextVolume: number) => {
    unlockAudio();
    setEnabled(nextEnabled);
    setVolume(nextVolume);
    setAudioSettings({ enabled: nextEnabled, volume: nextVolume });
    if (nextEnabled && nextVolume > 0) playSound("ui.select");
  };

  return (
    <header className="lab-nav">
      <Link className="lab-brand" href="/" aria-label="Venture Governance System home">
        <span aria-hidden="true">VG</span><strong>Venture Governance</strong><small>PUBLIC LAB</small>
      </Link>
      <nav aria-label="Public Lab navigation">
        {links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
        <button type="button" onClick={() => window.location.pathname.startsWith("/lab/demo") ? openLabTour() : window.location.assign("/lab/demo?tour=1")}>Help</button>
      </nav>
      <div className="lab-audio" aria-label="Audio controls">
        <button type="button" aria-pressed={enabled} onClick={() => updateAudio(!enabled, volume)}>{enabled ? "Sound On" : "Sound Off"}</button>
        <label><span className="sr-only">Volume</span><select value={volume} onChange={(event) => updateAudio(enabled, Number(event.target.value))} aria-label="Lab volume"><option value="0">0%</option><option value="25">25%</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option></select></label>
      </div>
    </header>
  );
}

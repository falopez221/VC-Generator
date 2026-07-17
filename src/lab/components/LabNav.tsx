"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PROJECT_NAME, SITE_LINKS } from "@/src/config/site";
import { getAudioSettings, playSound, setAudioSettings, unlockAudio } from "../audio.ts";
import { openLabTour } from "./LabTour.tsx";

const links = [
  ["Platform", "/"],
  ["Lab", "/lab"],
  ["Demo", "/lab/demo"],
  ["Methodology", "/lab/methodology"],
] as const;

export function LabNav() {
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(25);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const settings = getAudioSettings();
    queueMicrotask(() => {
      setEnabled(settings.enabled);
      setVolume(settings.volume);
    });
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menuOpen) {
        setMenuOpen(false);
        queueMicrotask(() => menuButtonRef.current?.focus());
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const updateAudio = (nextEnabled: boolean, nextVolume: number) => {
    unlockAudio();
    setEnabled(nextEnabled);
    setVolume(nextVolume);
    setAudioSettings({ enabled: nextEnabled, volume: nextVolume });
    if (nextEnabled && nextVolume > 0) playSound("ui.select");
  };

  const openHelp = () => {
    setMenuOpen(false);
    if (window.location.pathname.startsWith("/lab/demo")) openLabTour();
    else window.location.assign("/lab/demo?tour=1");
  };

  return (
    <header className="lab-nav">
      <div className="lab-nav-shell">
        <Link className="lab-brand" href="/" aria-label={`${PROJECT_NAME}, home`} onClick={() => setMenuOpen(false)}>
          <span className="lab-brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span className="lab-brand-copy"><strong>{PROJECT_NAME}</strong><small>PUBLIC LAB</small></span>
        </Link>

        <nav id="lab-navigation" className={menuOpen ? "lab-primary-nav is-open" : "lab-primary-nav"} aria-label="Public Lab navigation">
          {links.map(([label, href]) => {
            const active = href === "/" ? pathname === "/" : href === "/lab" ? pathname === "/lab" : pathname.startsWith(href);
            return (
              <Link className={active ? "is-active" : undefined} href={href} key={href} aria-current={active ? "page" : undefined} onClick={() => setMenuOpen(false)}>
                {label}
              </Link>
            );
          })}
          <button className="lab-mobile-help" type="button" onClick={openHelp}>Help / guided tour</button>
          <label className="lab-mobile-volume">
            <span>Volume</span>
            <select value={volume} onChange={(event) => updateAudio(enabled, Number(event.target.value))} aria-label="Lab volume, mobile menu">
              <option value="0">0%</option><option value="25">25%</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option>
            </select>
          </label>
        </nav>

        <div className="lab-nav-utilities" aria-label="Lab utilities">
          <button className="lab-help" type="button" onClick={openHelp}>Help</button>
          <button className={enabled ? "lab-sound is-on" : "lab-sound"} type="button" aria-pressed={enabled} aria-label={enabled ? "Disable Lab sound" : "Enable Lab sound"} onClick={() => updateAudio(!enabled, volume)}>
            <span aria-hidden="true">{enabled ? "Sound On" : "Sound Off"}</span>
            <span className="sr-only">Sound On is optional and begins only after user interaction.</span>
          </button>
          <label className="lab-volume">
            <span className="sr-only">Volume</span>
            <select value={volume} onChange={(event) => updateAudio(enabled, Number(event.target.value))} aria-label="Lab volume">
              <option value="0">0%</option><option value="25">25%</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option>
            </select>
          </label>
          <Link className="lab-access" href={SITE_LINKS.platform}>Workspace sign-in <span aria-hidden="true">→</span></Link>
          <button ref={menuButtonRef} className="lab-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="lab-navigation" onClick={() => setMenuOpen((value) => !value)}>
            <span>{menuOpen ? "Close" : "Menu"}</span><span className="lab-menu-lines" aria-hidden="true"><i /><i /></span>
          </button>
        </div>
      </div>
    </header>
  );
}

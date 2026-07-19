"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PROJECT_NAME, SITE_LINKS } from "@/src/config/site";
import { EntryVoicePicker } from "@/src/components/ui/EntryVoicePicker";
import { primeEntryVoice, readEntryVoiceChoice, speakEntryGreeting, storeEntryVoiceChoice, type EntryVoiceChoice } from "@/src/components/ui/entryVoice";
import { getAudioSettings, playSound, setAudioSettings, setLabScoreTheme, unlockAudio, type LabScoreTheme } from "../audio.ts";
import { openLabTour } from "./LabTour.tsx";

const links = [
  ["Platform", "/"],
  ["Lab", "/lab"],
  ["Demo", "/lab/demo"],
  ["MVP Lab", "/lab/mvp"],
  ["Simulation", "/lab/simulation"],
  ["Companies", "/lab/companies"],
  ["Valuation", "/lab/valuation"],
  ["Methodology", "/lab/methodology"],
] as const;

export function LabNav() {
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(25);
  const [menuOpen, setMenuOpen] = useState(false);
  const [entryState, setEntryState] = useState<"locked" | "entering" | "entered">("locked");
  const [entryVoice, setEntryVoice] = useState<EntryVoiceChoice>("female");
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primeEntryVoice();
    const settings = getAudioSettings();
    queueMicrotask(() => { setEnabled(settings.enabled); setVolume(settings.volume); setEntryVoice(readEntryVoiceChoice()); });
  }, []);

  useEffect(() => {
    const theme: LabScoreTheme = pathname.startsWith("/lab/demo") ? "simulation" : pathname.startsWith("/lab/results") ? "discovery" : pathname.startsWith("/lab/methodology") ? "methodology" : "lab";
    setLabScoreTheme(theme);
  }, [pathname]);

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

  const chooseEntryVoice = (choice: EntryVoiceChoice) => {
    setEntryVoice(choice);
    storeEntryVoiceChoice(choice);
  };

  const openHelp = () => {
    setMenuOpen(false);
    if (window.location.pathname.startsWith("/lab/demo")) openLabTour();
    else window.location.assign("/lab/demo?tour=1");
  };

  return (
    <>
      {entryState !== "entered" && <div className={`lab-audio-gate ${entryState === "entering" ? "is-entering" : ""}`} role="dialog" aria-modal="true" aria-labelledby="lab-entry-title"><div><span>PUBLIC LAB · AUDIOVISUAL MODE</span><h2 id="lab-entry-title">Observe the system think.</h2><p>Enter the intelligence field to activate the licensed score and live collective view.</p><EntryVoicePicker value={entryVoice} onChange={chooseEntryVoice} /><button className="entry-primary-action" type="button" autoFocus disabled={entryState === "entering"} onClick={() => { updateAudio(true, 35); void speakEntryGreeting(75, entryVoice).finally(() => updateAudio(true, 75)); setEntryState("entering"); window.setTimeout(() => setEntryState("entered"), 850); }}>ENTER THE FIELD <i aria-hidden="true">→</i></button><small>Sound begins at 75% · you can mute or adjust it after entering</small></div></div>}
      <header className="lab-nav">
        <div className="lab-nav-shell">
          <Link className="lab-brand" href="/" aria-label={`${PROJECT_NAME}, home`} onClick={() => setMenuOpen(false)}><span className="lab-brand-mark" aria-hidden="true"><i /><i /><i /></span><span className="lab-brand-copy"><strong>{PROJECT_NAME}</strong><small>PUBLIC LAB</small></span></Link>
          <nav id="lab-navigation" className={menuOpen ? "lab-primary-nav is-open" : "lab-primary-nav"} aria-label="Public Lab navigation">
            {links.map(([label, href]) => {
              const active = href === "/" ? pathname === "/" : href === "/lab" ? pathname === "/lab" : pathname.startsWith(href);
              return <Link className={active ? "is-active" : undefined} href={href} key={href} aria-current={active ? "page" : undefined} onClick={() => setMenuOpen(false)}>{label}</Link>;
            })}
            <button className="lab-mobile-help" type="button" onClick={openHelp}>Help / guided tour</button>
            <label className="lab-mobile-volume"><span>Volume</span><input type="range" min="0" max="100" step="1" value={volume} onChange={(event) => updateAudio(enabled, Number(event.target.value))} aria-label="Lab volume, mobile menu" /><output>{volume}%</output></label>
          </nav>
          <div className="lab-nav-utilities" aria-label="Lab utilities">
            <button className="lab-help" type="button" onClick={openHelp}>Help</button>
            <button className={enabled ? "lab-sound is-on" : "lab-sound"} type="button" aria-pressed={enabled} aria-label={enabled ? "Disable Lab sound" : "Enable Lab sound"} onClick={() => updateAudio(!enabled, volume)}><span aria-hidden="true">{enabled ? "Sound On" : "Sound Off"}</span><span className="sr-only">Sound On is optional and begins only after user interaction.</span></button>
            <label className="lab-volume"><span className="sr-only">Volume</span><input type="range" min="0" max="100" step="1" value={volume} onChange={(event) => updateAudio(enabled, Number(event.target.value))} aria-label="Lab volume" /><output>{volume}%</output></label>
            <Link className="lab-access" href={SITE_LINKS.platform}>Workspace sign-in <span aria-hidden="true">→</span></Link>
            <button ref={menuButtonRef} className="lab-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="lab-navigation" onClick={() => setMenuOpen((value) => !value)}><span>{menuOpen ? "Close" : "Menu"}</span><span className="lab-menu-lines" aria-hidden="true"><i /><i /></span></button>
          </div>
        </div>
      </header>
    </>
  );
}

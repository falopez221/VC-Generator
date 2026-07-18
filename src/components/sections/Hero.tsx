"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CinematicField } from "@/src/components/experience/CinematicField";
import { EntryVoicePicker } from "@/src/components/ui/EntryVoicePicker";
import { primeEntryVoice, readEntryVoiceChoice, speakEntryGreeting, storeEntryVoiceChoice, type EntryVoiceChoice } from "@/src/components/ui/entryVoice";
import { LinkButton } from "@/src/components/ui/LinkButton";
import { requestInterfaceSoundSettings } from "@/src/components/ui/SoundController";
import { SITE_LINKS } from "@/src/config/site";

export function Hero() {
  const [active, setActive] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [entryState, setEntryState] = useState<"locked" | "entering" | "entered">("locked");
  const [entryVoice, setEntryVoice] = useState<EntryVoiceChoice>("female");

  useEffect(() => {
    primeEntryVoice();
    queueMicrotask(() => setEntryVoice(readEntryVoiceChoice()));
  }, []);

  const chooseEntryVoice = (choice: EntryVoiceChoice) => {
    setEntryVoice(choice);
    storeEntryVoiceChoice(choice);
  };

  const enterSystem = () => {
    requestInterfaceSoundSettings({ enabled: true, volume: 35 });
    void speakEntryGreeting(75, entryVoice).finally(() => requestInterfaceSoundSettings({ enabled: true, volume: 75 }));
    setEntryState("entering");
    setRevealed(true);
    window.setTimeout(() => setEntryState("entered"), 850);
  };

  return (
    <>
      <section className={`cinematic-hero ${revealed ? "is-revealed" : ""}`} id="vision" lang="en">
        <CinematicField mode="intro" active={entryState !== "locked" && active} />
        {entryState !== "entered" && <div className={`cinematic-entry-gate ${entryState === "entering" ? "is-entering" : ""}`} role="dialog" aria-modal="true" aria-labelledby="entry-gate-title"><div><span>VENTURE GOVERNANCE SYSTEM™</span><h2 id="entry-gate-title">Knowledge begins in silence.</h2><p>Enter the intelligence field to activate the collective view and its licensed cinematic score.</p><EntryVoicePicker value={entryVoice} onChange={chooseEntryVoice} /><button className="entry-primary-action" type="button" autoFocus disabled={entryState === "entering"} onClick={enterSystem}>ENTER THE FIELD <i aria-hidden="true">→</i></button><small>Sound begins at 75% · mute and volume controls remain available inside</small></div></div>}
        <div className="cinematic-sequence" aria-hidden="true"><span>00:70</span><div /><small>collective inference field</small></div>
        <div className="cinematic-controls" aria-label="Experience controls">
          <button type="button" onClick={() => setActive((value) => !value)} aria-pressed={!active}>{active ? "PAUSE FIELD" : "RESUME FIELD"}</button>
          {!revealed && <button type="button" onClick={() => setRevealed(true)}>REVEAL INTERFACE</button>}
        </div>
        <div className="cinematic-hero-copy">
          <div>
            <p className="cinematic-eyebrow"><i aria-hidden="true" /> Venture Governance System™ · Public research surface · Human-in-command</p>
            <h1>Knowledge begins <span>as possibility.</span></h1>
            <p className="cinematic-hero-lede">A governed intelligence environment that turns a human thesis into inspectable opportunities, visible uncertainty and decisions that remain unmistakably human.</p>
            <div className="cinematic-hero-actions">
              <LinkButton href={SITE_LINKS.demo}>Enter the Public Lab</LinkButton>
              <LinkButton href="#platform" variant="secondary">Descend into the system</LinkButton>
            </div>
          </div>
          <aside className="cinematic-observer">
            <span>OBSERVED PROCESS · 01</span>
            <strong>Signals are organizing into specialist perspectives.</strong>
            <p>1,970 private profiles across 51 domains. Four public Lab agents. Human authority remains the final gate.</p>
          </aside>
        </div>
        <Link className="cinematic-scroll-cue" href="#platform">Enter system</Link>
      </section>

      <section className="experience-threshold" aria-labelledby="threshold-title">
        <div className="container">
          <span className="experience-threshold-index">CHAPTER 01 · THE SEARCH SPACE</span>
          <div>
            <h2 id="threshold-title">Not a stream of answers. <em>A visible field of competing possibilities.</em></h2>
            <p>The public experience reveals the architecture in layers: human intent, an aggregated private registry of 1,970 profiles across 51 domains, four visible Lab perspectives, quantitative stress tests and a named human decision. Individual private profiles remain outside this repository.</p>
          </div>
        </div>
      </section>
    </>
  );
}

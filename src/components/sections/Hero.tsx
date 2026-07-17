"use client";

import { useState } from "react";
import Link from "next/link";
import { CinematicField } from "@/src/components/experience/CinematicField";
import { LinkButton } from "@/src/components/ui/LinkButton";
import { requestInterfaceSound } from "@/src/components/ui/SoundController";
import { SITE_LINKS } from "@/src/config/site";

export function Hero() {
  const [active, setActive] = useState(true);
  const [revealed, setRevealed] = useState(false);

  return (
    <>
      <section className={`cinematic-hero ${revealed ? "is-revealed" : ""}`} id="vision" lang="en">
        <CinematicField mode="intro" active={active} />
        <div className="cinematic-sequence" aria-hidden="true"><span>00:70</span><div /><small>collective inference field</small></div>
        <div className="cinematic-controls" aria-label="Experience controls">
          <button type="button" onClick={() => setActive((value) => !value)} aria-pressed={!active}>{active ? "PAUSE FIELD" : "RESUME FIELD"}</button>
          {!revealed && <button type="button" onClick={() => { setRevealed(true); requestInterfaceSound("stage.complete"); }}>REVEAL INTERFACE</button>}
        </div>
        <div className="cinematic-hero-copy">
          <div>
            <p className="cinematic-eyebrow"><i aria-hidden="true" /> Venture Governance System™ · Whitepaper público v2.0 · Public research surface</p>
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
            <p>Four public agents. Synthetic data. Deterministic models. Human authority remains the final gate.</p>
          </aside>
        </div>
        <Link className="cinematic-scroll-cue" href="#platform">Enter system</Link>
      </section>

      <section className="experience-threshold" aria-labelledby="threshold-title">
        <div className="container">
          <span className="experience-threshold-index">CHAPTER 01 · THE SEARCH SPACE</span>
          <div>
            <h2 id="threshold-title">Not a stream of answers. <em>A visible field of competing possibilities.</em></h2>
            <p>The public experience reveals the architecture in layers: human intent, four specialist perspectives, quantitative stress tests, evidence boundaries and a named human decision. The complete private system remains outside this repository.</p>
          </div>
        </div>
      </section>
    </>
  );
}

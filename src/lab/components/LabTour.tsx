"use client";

import { useEffect, useState } from "react";

const TOUR_KEY = "venture-governance-public-lab-tour-v1";
const TOUR_EVENT = "venture-governance:open-tour";

const steps = [
  { target: "configure", number: "01", title: "Configure the simulation", copy: "Write the full idea or load an example. Review the assistant summary and every structured parameter." },
  { target: "run", number: "02", title: "Run the analysis", copy: "Launch the accelerated public pipeline and follow nine visible stages. Identical inputs and seed are reproducible." },
  { target: "ranking", number: "03", title: "Explore opportunities", copy: "After the run, open the ranking. Read score together with evidence, risk, uncertainty and agent disagreement." },
  { target: "models", number: "04", title: "Inspect mathematical models", copy: "Open the quantitative laboratory to inspect distributions, scenarios, sensitivity, risk and trade-offs." },
  { target: "models", number: "05", title: "Modify assumptions", copy: "Change public weights or sliders and observe which opportunities move. Final decisions always remain human." },
] as const;

export function LabTour() {
  const [mode, setMode] = useState<"closed" | "welcome" | "tour">("closed");
  const [step, setStep] = useState(0);

  useEffect(() => {
    const open = () => { setStep(0); setMode("welcome"); };
    window.addEventListener(TOUR_EVENT, open);
    const params = new URLSearchParams(window.location.search);
    if (params.get("tour") === "1" || window.localStorage.getItem(TOUR_KEY) !== "complete") queueMicrotask(open);
    if (params.get("tour") === "1") {
      params.delete("tour");
      window.history.replaceState({}, "", `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`);
    }
    return () => window.removeEventListener(TOUR_EVENT, open);
  }, []);

  useEffect(() => {
    if (mode !== "tour") return;
    const target = document.querySelector<HTMLElement>(`[data-tour-target="${steps[step].target}"]`);
    target?.classList.add("is-tour-highlight");
    target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    return () => target?.classList.remove("is-tour-highlight");
  }, [mode, step]);

  const close = () => {
    window.localStorage.setItem(TOUR_KEY, "complete");
    setMode("closed");
  };

  if (mode === "closed") return null;
  if (mode === "welcome") return <div className="lab-tour-backdrop"><section className="lab-tour-welcome" role="dialog" aria-modal="true" aria-labelledby="tour-welcome-title"><span>PUBLIC LAB · GUIDED TOUR</span><h2 id="tour-welcome-title">Welcome to Venture Governance Lab</h2><p>This demo illustrates how four specialized AI agents evaluate business opportunities using quantitative models.</p><ol>{steps.map((item) => <li key={item.number}><b>{item.number}</b>{item.title}</li>)}</ol><small>The guided experience takes about two minutes.</small><div><button className="lab-button lab-button--primary" type="button" onClick={() => setMode("tour")}>Start Tour</button><button className="lab-button" type="button" onClick={close}>Skip</button></div></section></div>;

  const current = steps[step];
  return <aside className="lab-tour-card" role="dialog" aria-label={`Tour step ${step + 1} of ${steps.length}`}><header><span>STEP {step + 1} / {steps.length}</span><button type="button" onClick={close} aria-label="Close tour">×</button></header><b>{current.number}</b><h2>{current.title}</h2><p>{current.copy}</p><div className="lab-tour-dots" aria-hidden="true">{steps.map((item, index) => <i className={index === step ? "is-active" : ""} key={item.number} />)}</div><footer>{step > 0 && <button className="lab-button" type="button" onClick={() => setStep((value) => value - 1)}>Back</button>}<button className="lab-button lab-button--primary" type="button" onClick={() => step === steps.length - 1 ? close() : setStep((value) => value + 1)}>{step === steps.length - 1 ? "Finish" : "Next"}</button></footer></aside>;
}

export function openLabTour() {
  window.dispatchEvent(new Event(TOUR_EVENT));
}

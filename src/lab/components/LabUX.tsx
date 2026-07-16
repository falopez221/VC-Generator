"use client";

import { useId } from "react";

export function InfoTip({ label, text }: { label: string; text: string }) {
  const id = useId();
  return <span className="lab-info-tip"><button type="button" aria-label={`Explain ${label}`} aria-describedby={id}>ⓘ</button><span className="lab-tooltip" id={id} role="tooltip">{text}</span></span>;
}

export function PanelIntro({ shows, useful }: { shows: string; useful: string }) {
  return <div className="lab-panel-intro"><p><span>WHAT DOES THIS SHOW?</span>{shows}</p><p><span>WHY IS IT USEFUL?</span>{useful}</p></div>;
}

export function ModelIntro({ shows, matters }: { shows: string; matters: string }) {
  return <div className="lab-model-intro"><p><span>WHAT DOES THIS SHOW?</span>{shows}</p><p><span>WHY DOES IT MATTER?</span>{matters}</p></div>;
}

export function SliderImpact({ items = ["Ranking", "Mathematical models", "Final prioritization"] }: { items?: string[] }) {
  return <small className="lab-slider-impact"><span>Changing this affects</span>{items.map((item) => <b key={item}>✓ {item}</b>)}</small>;
}

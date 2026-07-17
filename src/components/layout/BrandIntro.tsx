"use client";

import { useEffect, useState } from "react";

const INTRO_KEY = "venture-governance-intro-seen";

export function BrandIntro() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (window.sessionStorage.getItem(INTRO_KEY) === "yes") {
      queueMicrotask(() => setVisible(false));
      return;
    }

    window.sessionStorage.setItem(INTRO_KEY, "yes");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduceMotion ? 120 : 920;

    const timer = window.setTimeout(() => setVisible(false), duration);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="brand-intro" aria-hidden="true">
      <div className="intro-grid" />
      <div className="intro-lockup">
        <div className="intro-mark"><i /><i /><i /><span>™</span></div>
        <div className="intro-wordmark">
          <small>VENTURE GOVERNANCE</small>
          <strong>SYSTEM<span>™</span></strong>
        </div>
      </div>
      <div className="intro-progress"><i /></div>
    </div>
  );
}

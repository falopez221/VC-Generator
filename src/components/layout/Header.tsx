"use client";

import { useMemo, useState } from "react";
import { NAVIGATION, PROJECT_NAME, WHITEPAPER_AVAILABLE } from "@/src/config/site";
import { useActiveSection } from "@/src/hooks/use-active-section";

export function Header() {
  const [open, setOpen] = useState(false);
  const sectionIds = useMemo(
    () => NAVIGATION.filter((item) => item.href.startsWith("#")).map((item) => item.href.slice(1)),
    [],
  );
  const active = useActiveSection(sectionIds);

  return (
    <header className="site-header">
      <div className="nav-shell">
        <a className="brand" href="#vision" aria-label={`${PROJECT_NAME}, inicio`}>
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>{PROJECT_NAME}</span>
        </a>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="primary-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          <span>{open ? "Cerrar" : "Menú"}</span>
          <span className="menu-lines" aria-hidden="true"><i /><i /></span>
        </button>
        <nav id="primary-navigation" className={open ? "nav-links is-open" : "nav-links"} aria-label="Navegación principal">
          {NAVIGATION.map((item) => {
            const id = item.href.startsWith("#") ? item.href.slice(1) : "";
            const disabled = "disabled" in item && item.disabled;
            if (disabled) {
              return <span className="nav-link is-disabled" key={item.label} title="Whitepaper pendiente de incorporar">{item.label}</span>;
            }
            return (
              <a
                key={item.label}
                className={active === id ? "nav-link is-active" : "nav-link"}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active === id ? "location" : undefined}
              >
                {item.label}
              </a>
            );
          })}
          {!WHITEPAPER_AVAILABLE && <span className="nav-status">PDF pendiente</span>}
        </nav>
      </div>
    </header>
  );
}

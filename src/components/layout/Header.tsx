"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NAVIGATION_GROUPS,
  PRIMARY_NAVIGATION,
  PROJECT_NAME,
  SITE_LINKS,
} from "@/src/config/site";
import { useActiveSection } from "@/src/hooks/use-active-section";
import { SoundController } from "@/src/components/ui/SoundController";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const sectionIds = useMemo(
    () => PRIMARY_NAVIGATION.filter((item) => item.href.startsWith("/#")).map((item) => item.href.slice(2)),
    [],
  );
  const active = useActiveSection(sectionIds);
  const panelOpen = menuOpen || directoryOpen;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && panelOpen) {
        const trigger = activeTriggerRef.current;
        setMenuOpen(false);
        setDirectoryOpen(false);
        queueMicrotask(() => trigger?.focus());
      }
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (panelOpen && !headerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setDirectoryOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [panelOpen]);

  const closePanel = () => {
    setMenuOpen(false);
    setDirectoryOpen(false);
  };

  return (
    <header className="site-header" ref={headerRef} lang="en">
      <div className="nav-shell">
        <Link className="brand" href="/" aria-label={`${PROJECT_NAME}, home`} onClick={closePanel}>
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>{PROJECT_NAME}</span>
        </Link>

        <nav className="primary-nav" aria-label="Primary navigation">
          {PRIMARY_NAVIGATION.map((item) => {
            const id = item.href.startsWith("/#") ? item.href.slice(2) : "";
            const routeActive = !item.href.startsWith("/#") && pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                className={active === id || routeActive ? "nav-link is-active" : "nav-link"}
                href={item.href}
                onClick={closePanel}
                aria-current={active === id || routeActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            className={directoryOpen ? "nav-directory-trigger is-open" : "nav-directory-trigger"}
            type="button"
            aria-expanded={directoryOpen}
            aria-controls="enterprise-navigation"
            onClick={(event) => {
              activeTriggerRef.current = event.currentTarget;
              setDirectoryOpen((value) => !value);
              setMenuOpen(false);
            }}
          >
            Explore <span aria-hidden="true">+</span>
          </button>
        </nav>

        <div className="nav-utilities">
          <SoundController />
          <Link className="nav-access" href={SITE_LINKS.platform} onClick={closePanel}>Workspace sign-in <span aria-hidden="true">→</span></Link>
          <button
            className="menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="enterprise-navigation"
            onClick={(event) => {
              activeTriggerRef.current = event.currentTarget;
              setMenuOpen((value) => !value);
              setDirectoryOpen(false);
            }}
          >
            <span>{menuOpen ? "Close" : "Menu"}</span>
            <span className="menu-lines" aria-hidden="true"><i /><i /></span>
          </button>
        </div>

        <nav id="enterprise-navigation" className="enterprise-navigation" aria-label="System directory" hidden={!panelOpen}>
          <div className="enterprise-navigation-intro">
            <div>
              <span>SYSTEM DIRECTORY</span>
              <strong>Explore Venture Governance</strong>
            </div>
            <p>A bounded public view of a larger private architecture. Four visible agents, documented models and named human authority.</p>
          </div>
          <div className="enterprise-navigation-grid">
            {NAVIGATION_GROUPS.map((group, index) => (
              <section key={group.label} aria-labelledby={`navigation-group-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h2 id={`navigation-group-${index}`}>{group.label}</h2>
                  <p>{group.description}</p>
                  <ul>
                    {group.links.map((item) => (
                      <li key={item.label}><Link href={item.href} onClick={closePanel}>{item.label}<span aria-hidden="true">↗</span></Link></li>
                    ))}
                  </ul>
                </div>
              </section>
            ))}
          </div>
          <div className="enterprise-navigation-foot">
            <span>PUBLIC BOUNDARY · SYNTHETIC DATA · NO INVESTMENT APPROVAL</span>
            <Link href="/request-access" onClick={closePanel}>Request an authorized workspace <span aria-hidden="true">→</span></Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

import Link from "next/link";
import { LinkButton } from "@/src/components/ui/LinkButton";
import { SITE_LINKS, WHITEPAPER_AVAILABLE } from "@/src/config/site";
import { HeroExperience } from "@/src/components/sections/HeroExperience";

const PUBLIC_PROOF = [
  ["04", "Public specialist agents"],
  ["12+2", "Core models + context lenses"],
  ["6–12", "Reproducible synthetic opportunities"],
  ["01", "Named Human Gate"],
] as const;

export function Hero() {
  return (
    <section className="hero" id="vision" lang="en">
      <div className="hero-grid container">
        <div className="hero-copy">
          <div className="system-status"><i aria-hidden="true" /> <span lang="es">Whitepaper público v2.0</span> · Multi-agent decision intelligence · Human-in-command</div>
          <h1>Explore more possibilities. <em>Keep authority visible.</em></h1>
          <p className="hero-tagline">AI explores. Models evaluate. Humans decide.</p>
          <p className="hero-description">Venture Governance turns a human mandate into an inspectable network of evidence, specialist agents and quantitative models—then returns prioritized opportunities for human review.</p>
          <div className="hero-actions">
            <LinkButton href={SITE_LINKS.demo}>Run the Public Lab</LinkButton>
            <LinkButton href={SITE_LINKS.platform} variant="secondary">Workspace sign-in</LinkButton>
          </div>
          <nav className="hero-secondary-links" aria-label="Further reading">
            <Link href={SITE_LINKS.secondaryCta}>Explore architecture <span aria-hidden="true">↗</span></Link>
            {WHITEPAPER_AVAILABLE && <Link href={SITE_LINKS.whitepaper}>Read the whitepaper <span aria-hidden="true">↗</span></Link>}
          </nav>
        </div>
        <div className="hero-experience-wrap">
          <HeroExperience />
          <p className="hero-experience-note">INTERACTIVE SYSTEM SEQUENCE · SELECT AN AGENT TO INSPECT ITS ROLE</p>
        </div>
      </div>
      <div className="hero-proof container" aria-label="Public system scope">
        {PUBLIC_PROOF.map(([value, label]) => (
          <div key={label}><strong>{value}</strong><span>{label}</span></div>
        ))}
      </div>
      <div className="hero-rail container">
        <span>Built for governed exploration</span>
        <div>VENTURE CAPITAL</div>
        <div>VENTURE STUDIOS</div>
        <div>CORPORATE INNOVATION</div>
        <div>INSTITUTIONAL RESEARCH</div>
      </div>
    </section>
  );
}

import { LinkButton } from "@/src/components/ui/LinkButton";
import {
  SITE_LINKS,
  WHITEPAPER_AVAILABLE,
} from "@/src/config/site";
import { HeroExperience } from "@/src/components/sections/HeroExperience";

export function Hero() {
  return (
    <section className="hero" id="vision">
      <div className="hero-grid container">
        <div className="hero-copy">
          <div className="system-status"><span /> Whitepaper público v2.0 · 4 agentes · Human-in-command</div>
          <h1>AI Multi-Agent Intelligence <em>for Opportunity Discovery</em></h1>
          <p className="hero-tagline">AI explores. Models evaluate. Humans decide.</p>
          <p className="hero-description">Venture Governance explores large spaces of possible business opportunities, evaluates them through specialized agents and quantitative models, and prioritizes candidates for human review.</p>
          <div className="hero-actions">
            <LinkButton href={SITE_LINKS.platform}>Enter Platform</LinkButton>
            <LinkButton href={SITE_LINKS.demo} variant="secondary">Explore Public Demo</LinkButton>
            <LinkButton href={SITE_LINKS.secondaryCta} variant="quiet">Architecture</LinkButton>
            <LinkButton href={SITE_LINKS.whitepaper} variant="quiet" disabled={!WHITEPAPER_AVAILABLE}>Read the Whitepaper</LinkButton>
          </div>
          <div className="hero-proof" aria-label="Principios del sistema">
            <div><strong>01</strong><span>Human<br />mandate</span></div>
            <div><strong>02</strong><span>Explicit<br />uncertainty</span></div>
            <div><strong>03</strong><span>Human-in-<br />command</span></div>
          </div>
        </div>
        <HeroExperience />
      </div>
      <div className="hero-rail container">
        <span>Designed for</span>
        <div>VENTURE CAPITAL</div><div>VENTURE STUDIOS</div><div>CORPORATE INNOVATION</div><div>INSTITUTIONAL RESEARCH</div>
        <LinkButton href={SITE_LINKS.whitepaper} variant="quiet" disabled={!WHITEPAPER_AVAILABLE}>Abrir whitepaper</LinkButton>
      </div>
    </section>
  );
}

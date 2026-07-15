import { LinkButton } from "@/src/components/ui/LinkButton";
import {
  PROJECT_DESCRIPTION,
  PROJECT_TAGLINE,
  SITE_LINKS,
  WHITEPAPER_AVAILABLE,
} from "@/src/config/site";

const heroAgents = ["Mercado", "Riesgo", "Economía", "Técnico", "Simulación", "Estrategia"];

export function Hero() {
  return (
    <section className="hero" id="vision">
      <div className="hero-grid container">
        <div className="hero-copy">
          <div className="system-status"><span /> Whitepaper v1.0 · Arquitectura conceptual · Human-in-command</div>
          <h1>Inteligencia de venture, <em>orquestada.</em></h1>
          <p className="hero-tagline">{PROJECT_TAGLINE}</p>
          <p className="hero-description">{PROJECT_DESCRIPTION}</p>
          <div className="hero-actions">
            <LinkButton href={SITE_LINKS.primaryCta}>Explorar el sistema</LinkButton>
            <LinkButton href={SITE_LINKS.secondaryCta} variant="secondary">Ver arquitectura</LinkButton>
          </div>
          <div className="hero-proof" aria-label="Principios del sistema">
            <div><strong>01</strong><span>Evidencia<br />trazable</span></div>
            <div><strong>02</strong><span>Incertidumbre<br />explícita</span></div>
            <div><strong>03</strong><span>Decisión<br />humana</span></div>
          </div>
        </div>
        <div className="hero-visual" aria-label="Diagrama conceptual de una red multiagente conectada a un orquestador">
          <div className="visual-caption"><span>LIVE MODEL</span><span>6/20 roles visibles</span></div>
          <div className="network-stage">
            <div className="network-ring network-ring--outer" />
            <div className="network-ring network-ring--inner" />
            <div className="network-core">
              <span className="core-signal" />
              <small>NÚCLEO</small>
              <strong>ORQ</strong>
              <span>Orquestador</span>
            </div>
            {heroAgents.map((agent, index) => (
              <div className={`network-node network-node--${index + 1}`} key={agent}>
                <i />
                <span>{agent}</span>
              </div>
            ))}
            <div className="data-pulse pulse-a" /><div className="data-pulse pulse-b" />
          </div>
          <div className="visual-footer">
            <span><i className="legend-dot is-active" /> Coordinación</span>
            <span><i className="legend-dot" /> Especialistas</span>
            <span><i className="legend-line" /> Flujo auditable</span>
          </div>
        </div>
      </div>
      <div className="hero-rail container">
        <span>Designed for</span>
        <div>VENTURE CAPITAL</div><div>VENTURE STUDIOS</div><div>CORPORATE INNOVATION</div><div>INSTITUTIONAL RESEARCH</div>
        <LinkButton href={SITE_LINKS.whitepaper} variant="quiet" disabled={!WHITEPAPER_AVAILABLE}>Abrir whitepaper</LinkButton>
      </div>
    </section>
  );
}

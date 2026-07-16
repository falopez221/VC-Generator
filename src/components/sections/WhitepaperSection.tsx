import { LinkButton } from "@/src/components/ui/LinkButton";
import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { SITE_LINKS, WHITEPAPER_AVAILABLE } from "@/src/config/site";
import { WHITEPAPER_DOMAINS, WHITEPAPER_META } from "@/src/content/whitepaper";

export function WhitepaperSection() {
  return (
    <section className="section whitepaper-section" id="whitepaper">
      <div className="container">
        <SectionHeading
          eyebrow="13 · Whitepaper estratégico"
          title="El sistema completo, con supuestos, fuentes y límites."
          description="Versión 1.0 del documento maestro: arquitectura, roles, métodos cuantitativos, algoritmos, producto, implementación y gobierno responsable."
        />
        <div className="whitepaper-shell">
          <div className="whitepaper-cover" aria-label="Portada estilizada del whitepaper Venture Governance System, marca comercial">
            <div className="cover-meta"><span>DOCUMENTO ESTRATÉGICO</span><span>VERSIÓN {WHITEPAPER_META.version}</span></div>
            <h3>Venture<br />Governance <em>System<sup>™</sup></em></h3>
            <p>Arquitectura multiagente para explorar, diseñar, simular y priorizar oportunidades de Venture Capital.</p>
            <div className="cover-wave"><i /><i /><i /><i /></div>
            <div className="cover-bottom"><span>{WHITEPAPER_META.date}</span><span>{WHITEPAPER_META.pages} páginas</span></div>
          </div>
          <div className="whitepaper-content">
            <div className="whitepaper-statline"><span><strong>{WHITEPAPER_META.chapters}</strong> capítulos</span><span><strong>20</strong> roles lógicos</span><span><strong>6</strong> runtimes MVP</span></div>
            <div className="whitepaper-domains">
              {WHITEPAPER_DOMAINS.map((domain) => (
                <article key={domain.index}><span>{domain.index}</span><div><h3>{domain.title}</h3><p>{domain.chapters}</p></div></article>
              ))}
            </div>
            <blockquote><span>NORTH STAR</span>{WHITEPAPER_META.northStar}</blockquote>
            <div className="whitepaper-actions">
              <LinkButton href={SITE_LINKS.whitepaper} disabled={!WHITEPAPER_AVAILABLE}>Abrir whitepaper</LinkButton>
              <LinkButton href={SITE_LINKS.whitepaper} variant="secondary" download disabled={!WHITEPAPER_AVAILABLE} ariaLabel="Descargar whitepaper en PDF">Descargar PDF</LinkButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

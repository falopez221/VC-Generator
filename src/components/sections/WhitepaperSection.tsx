import { LinkButton } from "@/src/components/ui/LinkButton";
import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { SITE_LINKS, WHITEPAPER_AVAILABLE } from "@/src/config/site";
import { WHITEPAPER_DOMAINS, WHITEPAPER_META } from "@/src/content/whitepaper";
import { ProgressiveDisclosure } from "@/src/components/ui/ProgressiveDisclosure";

export function WhitepaperSection() {
  return (
    <section className="section whitepaper-section" id="whitepaper">
      <div className="container">
        <SectionHeading
          eyebrow="13 · Whitepaper público"
          title="La superficie pública completa, con supuestos, fuentes y límites."
          description="Versión 2026.2: registro privado agregado de 1.970 perfiles en 51 dominios, cuatro agentes públicos del Lab, 14 modelos demostrativos y frontera explícita con el producto privado."
        />
        <ProgressiveDisclosure
          what="El documento público y reproducible de Venture Governance System™."
          does="Consolida alcance, arquitectura, agentes, modelos, seguridad, pruebas y gobierno humano."
          matters="Permite evaluar el sistema más allá de la narrativa breve de la landing."
          how={["Recorre 13 capítulos y 4 apéndices.", "Conecta cada modelo con una pregunta, salida y limitación.", "Declara fuentes, evidencia, frontera IP y autoridad humana."]}
          technical={["Versión, fecha y alcance identificados.", "Registro privado agregado: 1.970 perfiles en 51 dominios; Lab: 4 agentes públicos y 14 modelos.", "Funciones deterministas, seed reproducible y contratos tipados."]}
          limitations={["Describe un Lab público, no el sistema privado completo.", "Los modelos no constituyen calibración histórica ni pronóstico.", "Ningún resultado autoriza inversión, financiación o ejecución."]}
        />
        <div className="whitepaper-shell">
          <div className="whitepaper-cover" aria-label="Portada estilizada del whitepaper Venture Governance System, marca comercial">
            <div className="cover-meta"><span>DOCUMENTO ESTRATÉGICO</span><span>VERSIÓN {WHITEPAPER_META.version}</span></div>
            <h3>Venture<br />Governance <em>System<sup>™</sup></em></h3>
            <p>Arquitectura pública para explorar, comparar y priorizar oportunidades sintéticas bajo revisión humana.</p>
            <div className="cover-wave"><i /><i /><i /><i /></div>
            <div className="cover-bottom"><span>{WHITEPAPER_META.date}</span><span>{WHITEPAPER_META.pages} páginas</span></div>
          </div>
          <div className="whitepaper-content">
            <div className="whitepaper-statline"><span><strong>{WHITEPAPER_META.chapters}</strong> capítulos</span><span><strong>1.970</strong> perfiles · 51 dominios</span><span><strong>4</strong> agentes públicos del Lab</span></div>
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

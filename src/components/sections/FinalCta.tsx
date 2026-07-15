import { LinkButton } from "@/src/components/ui/LinkButton";
import { SITE_LINKS, WHITEPAPER_AVAILABLE } from "@/src/config/site";

export function FinalCta() {
  return (
    <section className="final-cta" id="contacto">
      <div className="container final-cta-grid">
        <div>
          <p className="eyebrow">Próximo paso</p>
          <h2>Convertir una tesis amplia en un piloto medible.</h2>
          <p>Una colaboración inicial debería elegir un workflow, definir evidencia aceptable y acordar dónde la decisión sigue siendo humana.</p>
        </div>
        <div className="cta-panel">
          <div><span>01</span><p>Seleccionar una tesis o proceso real.</p></div>
          <div><span>02</span><p>Configurar agentes, fuentes y gates.</p></div>
          <div><span>03</span><p>Medir calidad, tiempo y aprendizaje.</p></div>
          <div className="cta-actions">
            <LinkButton href={SITE_LINKS.email}>Discutir un piloto</LinkButton>
            <LinkButton href={SITE_LINKS.whitepaper} variant="secondary" disabled={!WHITEPAPER_AVAILABLE}>Abrir whitepaper</LinkButton>
          </div>
        </div>
      </div>
    </section>
  );
}

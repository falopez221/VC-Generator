import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { ProgressiveDisclosure } from "@/src/components/ui/ProgressiveDisclosure";
import { ARCHITECTURE_LAYERS } from "@/src/content/architecture";

export function Architecture() {
  return (
    <section className="section section--paper" id="arquitectura">
      <div className="container">
        <SectionHeading
          eyebrow="04 · Arquitectura conceptual"
          title="Seis planos para razonar, observar y gobernar."
          description="Cuatro agentes públicos trabajan sobre contratos estructurados; validación, generación, ranking, persistencia y revisión permanecen como módulos deterministas y auditables."
        />
        <ProgressiveDisclosure
          what="Una arquitectura conceptual organizada en seis planos operativos y controles transversales."
          does="Separa descubrimiento, diseño, evaluación, validación y decisión para que cada entrega pueda inspeccionarse."
          matters="La separación reduce acoplamiento, hace visibles las responsabilidades y permite escalar sólo donde aporta calidad."
          how={["El orquestador activa capacidades según dependencias.", "Cada plano produce artefactos versionados.", "Memoria, observabilidad, seguridad y supervisión atraviesan todo el flujo."]}
          technical={["4 agentes públicos y catálogo versionado de 12 modelos.", "Funciones puras, seed reproducible y persistencia local validada.", "Contratos tipados separan interfaz, dominio y modelos."]}
          limitations={["Es la arquitectura del demostrador público, no la red privada.", "No incluye APIs pagas, autenticación ni datos remotos.", "Los resultados son sintéticos hasta que una etiqueta indique evidencia aportada."]}
        />
        <div className="architecture-layout">
          <div className="layer-stack" aria-label="Arquitectura de software por capas">
            {ARCHITECTURE_LAYERS.map((row, index) => (
              <article className="architecture-layer" key={row.layer}>
                <span className="layer-number">0{index + 1}</span>
                <h3>{row.layer}</h3>
                <div>{row.modules.map((module) => <span key={module}>{module}</span>)}</div>
              </article>
            ))}
          </div>
          <aside className="architecture-aside">
            <div className="aside-label">CROSS-LAYER CONTROLS</div>
            <div className="control-track"><span>01</span><div><strong>Memoria</strong><p>Contexto versionado, fuentes y decisiones.</p></div></div>
            <div className="control-track"><span>02</span><div><strong>Observabilidad</strong><p>Costos, latencia, errores y calidad.</p></div></div>
            <div className="control-track"><span>03</span><div><strong>Seguridad</strong><p>Permisos, aislamiento y auditoría.</p></div></div>
            <div className="control-track"><span>04</span><div><strong>Supervisión humana</strong><p>Gates, excepciones y autoridad final.</p></div></div>
          </aside>
        </div>
        <div className="architecture-principles">
          <span>4 AGENTES PÚBLICOS</span><span>12 MODELOS V2</span><span>FLUJO DETERMINISTA</span><span>LOCAL-FIRST</span><span>HUMAN-IN-COMMAND</span>
        </div>
      </div>
    </section>
  );
}

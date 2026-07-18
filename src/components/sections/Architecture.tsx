import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { ProgressiveDisclosure } from "@/src/components/ui/ProgressiveDisclosure";
import { ARCHITECTURE_LAYERS } from "@/src/content/architecture";

export function Architecture() {
  return (
    <section className="section section--paper" id="arquitectura">
      <div className="container">
        <SectionHeading
          eyebrow="04 · Arquitectura conceptual"
          title="Siete planos para seleccionar capacidades y gobernar decisiones."
          description="La arquitectura separa un registro privado agregado de 1.970 perfiles en 51 dominios de la ejecución. El Lab muestra cuatro especialistas representativos; no define el tamaño de la red privada."
        />
        <ProgressiveDisclosure
          what="Una arquitectura conceptual organizada en siete planos operativos y controles transversales."
          does="Separa misión, registro de capacidades, selección, validación, ejecución y decisión para que cada entrega pueda inspeccionarse."
          matters="La separación reduce acoplamiento y permite ampliar el catálogo sin convertir todos los perfiles en participantes de cada misión."
          how={["La misión selecciona sólo las capacidades pertinentes según alcance y dependencias.", "Cada plano produce artefactos versionados.", "Memoria, observabilidad, seguridad y supervisión atraviesan todo el flujo."]}
          technical={["El registro privado reúne 1.970 perfiles en 51 dominios; el Lab expone sólo 4 agentes representativos.", "Funciones puras, seed reproducible y persistencia local validada.", "Contratos tipados separan interfaz, dominio, capacidades y modelos."]}
          limitations={["Esta visualización muestra sólo el agregado del registro: no publica perfiles, prompts ni lógica privada de selección.", "El Lab no incluye APIs pagas, autenticación ni datos remotos por defecto.", "Los resultados son sintéticos hasta que una etiqueta indique evidencia aportada."]}
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
          <span>1.970 PERFILES · 51 DOMINIOS</span><span>SELECCIÓN POR MISIÓN</span><span>4 AGENTES EN EL LAB</span><span>FLUJO DETERMINISTA</span><span>HUMAN-IN-COMMAND</span>
        </div>
      </div>
    </section>
  );
}

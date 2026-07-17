import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { ProgressiveDisclosure } from "@/src/components/ui/ProgressiveDisclosure";
import { BUSINESS_MODEL, USE_CASES } from "@/src/content/use-cases";

export function UseCasesBusiness() {
  return (
    <section className="section section--paper" id="casos">
      <div className="container">
        <SectionHeading
          eyebrow="10 · Casos de uso"
          title="Una arquitectura, distintos puntos de entrada."
          description="La propuesta no reemplaza el proceso de cada institución: se integra en el tramo donde el costo de coordinación o incertidumbre es mayor."
        />
        <ProgressiveDisclosure
          what="Una misma arquitectura aplicada a distintos cuellos de botella institucionales."
          does="Adapta el punto de entrada a fondos, corporaciones, estudios, innovación y exploración de mercados."
          matters="Permite empezar con un workflow medible antes de desplegar una plataforma amplia."
          how={["Se selecciona un proceso real.", "Se define evidencia aceptable y un gate humano.", "La memoria y las integraciones se expanden sólo después de validar utilidad."]}
          technical={["Configuración por workflow y mandato.", "Modelo recurrente con pilotos acotados.", "Integración progresiva con fuentes y sistemas autorizados."]}
          limitations={["No se afirman precios, ingresos o adopción sin evidencia.", "Cada vertical requiere controles y fuentes propios.", "El valor depende de integración en decisiones reales."]}
        />
        <div className="use-case-grid">
          {USE_CASES.map((item, index) => (
            <article className="use-case" key={item.audience}>
              <span>{String(index + 1).padStart(2, "0")}</span><h3>{item.audience}</h3><p>{item.use}</p><small>{item.shift}</small>
            </article>
          ))}
        </div>
        <div className="business-panel">
          <div className="business-intro"><p className="eyebrow">Modelo de negocio</p><h3>Entrar con un workflow. Expandir con memoria e integración.</h3><p>La comercialización propuesta combina producto recurrente con pilotos acotados. No se presentan precios, ingresos ni adopción sin evidencia.</p></div>
          <div className="business-grid">{BUSINESS_MODEL.map((item) => <div key={item.label}><span>{item.label}</span><p>{item.value}</p></div>)}</div>
        </div>
      </div>
    </section>
  );
}

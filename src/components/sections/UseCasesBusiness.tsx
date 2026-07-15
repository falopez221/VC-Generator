import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { BUSINESS_MODEL, USE_CASES } from "@/src/content/use-cases";

export function UseCasesBusiness() {
  return (
    <section className="section section--paper" id="casos">
      <div className="container">
        <SectionHeading
          eyebrow="09 · Casos de uso"
          title="Una arquitectura, distintos puntos de entrada."
          description="La propuesta no reemplaza el proceso de cada institución: se integra en el tramo donde el costo de coordinación o incertidumbre es mayor."
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

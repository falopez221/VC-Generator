export const PIPELINE = [
  { phase: "01", name: "Tesis de inversión", detail: "Define universo, restricciones y criterio de éxito.", gate: "Mandato humano" },
  { phase: "02", name: "Descubrimiento", detail: "Convierte señales en problemas trazables.", gate: "Revisión de evidencia" },
  { phase: "03", name: "Generación", detail: "Produce modelos alternativos y explicita supuestos.", gate: "Diversidad mínima" },
  { phase: "04", name: "Deduplicación", detail: "Agrupa equivalentes sin borrar diferencias materiales.", gate: "Excepciones revisadas" },
  { phase: "05", name: "Clasificación", detail: "Aplica taxonomías y ranking multicriterio inicial.", gate: "Criterios configurables" },
  { phase: "06", name: "Diseño técnico", detail: "Evalúa arquitectura, seguridad y factibilidad.", gate: "Riesgos críticos" },
  { phase: "07", name: "Economía y mercado", detail: "Contrasta unidad económica, demanda y distribución.", gate: "Supuestos visibles" },
  { phase: "08", name: "Modelado", detail: "Explora incertidumbre, sensibilidad e incentivos.", gate: "Calibración" },
  { phase: "09", name: "Simulación", detail: "Compara escenarios conservador, base y expansivo.", gate: "Stress test" },
  { phase: "10", name: "Revisión crítica", detail: "Contrasta la tesis y documenta contradicciones.", gate: "Condiciones de pausa" },
  { phase: "11", name: "Validación Lean", detail: "Diseña experimentos para reducir la mayor incertidumbre.", gate: "Humano aprueba MVP" },
  { phase: "12", name: "Ranking y comité", detail: "Sintetiza score, confianza, evidencia y disenso.", gate: "Decisión humana" },
] as const;

export const MATH_MODELS = [
  { name: "Monte Carlo", purpose: "Explorar distribuciones de resultados, no un único pronóstico.", output: "Percentiles y probabilidad de umbrales" },
  { name: "Sensibilidad", purpose: "Identificar qué supuestos dominan el resultado.", output: "Drivers y rangos críticos" },
  { name: "Stress testing", purpose: "Forzar escenarios correlacionados y condiciones de ruptura.", output: "Puntos de falla y mitigaciones" },
  { name: "Actualización bayesiana", purpose: "Revisar creencias cuando aparece nueva evidencia.", output: "Prior, evidencia y posterior" },
  { name: "Modelos basados en agentes", purpose: "Estudiar interacciones y resultados emergentes.", output: "Dinámicas, no solo promedios" },
  { name: "Opciones reales", purpose: "Valorar la flexibilidad de esperar, expandir o abandonar.", output: "Decisiones por etapas" },
  { name: "Optimización multiobjetivo", purpose: "Exponer trade-offs sin colapsarlos en un score opaco.", output: "Frontera de Pareto" },
] as const;

export const SCORE_DIMENSIONS = [
  { name: "Gravedad del problema", value: 78, confidence: "media" },
  { name: "Evidencia de mercado", value: 62, confidence: "baja" },
  { name: "Diferenciación", value: 84, confidence: "media" },
  { name: "Viabilidad técnica", value: 70, confidence: "media" },
  { name: "Sostenibilidad económica", value: 58, confidence: "baja" },
  { name: "Defensibilidad", value: 68, confidence: "baja" },
  { name: "Velocidad de validación", value: 76, confidence: "media" },
] as const;

export const ALGORITHMS = [
  { task: "Evidencia", method: "Embeddings + búsqueda semántica + HNSW", tradeoff: "Cobertura / latencia" },
  { task: "Deduplicación", method: "Clustering + MinHash/LSH + revisión", tradeoff: "Recall / diversidad" },
  { task: "Ranking", method: "MCDA + calibración + MMR", tradeoff: "Relevancia / exploración" },
  { task: "Simulación", method: "Monte Carlo + modelos bayesianos", tradeoff: "Fidelidad / costo" },
  { task: "Asignación", method: "Colas por prioridad + caché + paralelismo", tradeoff: "Profundidad / presupuesto" },
  { task: "Control", method: "Anomalías + evaluación cruzada + auditoría", tradeoff: "Sensibilidad / alertas incorrectas" },
] as const;

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

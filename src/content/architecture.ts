export const ARCHITECTURE_LAYERS = [
  { layer: "Interfaz y gobierno", modules: ["Tesis", "Aprobaciones", "Disenso", "Kill switch"] },
  { layer: "Orquestación y control", modules: ["DAG", "Routing", "Presupuestos", "Políticas"] },
  { layer: "Plano de agentes", modules: ["Descubrimiento", "Técnica", "Economía", "Riesgo"] },
  { layer: "Laboratorio cuantitativo", modules: ["Modelos", "Monte Carlo", "Juegos", "Optimización"] },
  { layer: "Datos, evidencia y memoria", modules: ["Fuentes", "RAG", "Ontología", "Procedencia"] },
  { layer: "Seguridad y observabilidad", modules: ["Guardrails", "Evals", "Trazas", "Auditoría"] },
] as const;

export const VALUE_TRANSFORMATION = [
  { input: "Tesis", output: "Universo de exploración" },
  { input: "Señales", output: "Problemas priorizados" },
  { input: "Hipótesis", output: "Modelos comparables" },
  { input: "Datos", output: "Evidencia trazable" },
  { input: "Incertidumbre", output: "Escenarios y experimentos" },
  { input: "Criterios", output: "Ranking explicable" },
] as const;

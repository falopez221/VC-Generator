export const ARCHITECTURE_LAYERS = [
  { layer: "Experiencia", modules: ["Workspace", "Explorador", "Memos", "Comité"] },
  { layer: "Orquestación", modules: ["Planner", "Routing", "Presupuestos", "Human gates"] },
  { layer: "Inteligencia", modules: ["Agentes", "Retrieval", "Simulación", "Evaluación"] },
  { layer: "Conocimiento", modules: ["Fuentes", "Memoria", "Embeddings", "Taxonomías"] },
  { layer: "Confianza", modules: ["Observabilidad", "Auditoría", "Seguridad", "Gobierno"] },
] as const;

export const VALUE_TRANSFORMATION = [
  { input: "Tesis", output: "Universo de exploración" },
  { input: "Señales", output: "Problemas priorizados" },
  { input: "Hipótesis", output: "Modelos comparables" },
  { input: "Datos", output: "Evidencia trazable" },
  { input: "Incertidumbre", output: "Escenarios y experimentos" },
  { input: "Criterios", output: "Ranking explicable" },
] as const;

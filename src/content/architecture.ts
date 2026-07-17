export const ARCHITECTURE_LAYERS = [
  { layer: "Interfaz y revisión humana", modules: ["Tesis", "Configuración", "Comparación", "Revisión"] },
  { layer: "Validación y ejecución", modules: ["Sanitización", "Bounds", "Seed", "Versión"] },
  { layer: "Cuatro agentes públicos", modules: ["Mathematics", "Finance", "Strategy", "Marketing"] },
  { layer: "Biblioteca cuantitativa", modules: ["12 modelos", "Escenarios", "Robustez", "Pareto"] },
  { layer: "Estado y evidencia", modules: ["Etiquetas", "Persistencia local", "Exportación", "Procedencia"] },
  { layer: "Seguridad y accesibilidad", modules: ["Guardrails", "ARIA", "Audio opcional", "Pruebas"] },
] as const;

export const VALUE_TRANSFORMATION = [
  { input: "Tesis", output: "Universo de exploración" },
  { input: "Señales", output: "Problemas priorizados" },
  { input: "Hipótesis", output: "Modelos comparables" },
  { input: "Datos", output: "Evidencia trazable" },
  { input: "Incertidumbre", output: "Escenarios y experimentos" },
  { input: "Criterios", output: "Ranking explicable" },
] as const;

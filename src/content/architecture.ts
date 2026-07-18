export const ARCHITECTURE_LAYERS = [
  { layer: "Interfaz y revisión humana", modules: ["Tesis", "Configuración", "Comparación", "Revisión"] },
  { layer: "Gobernanza de misión", modules: ["Alcance", "Autoridad", "Restricciones", "Gates"] },
  { layer: "Registro y selección de capacidades", modules: ["1.970 perfiles", "51 dominios", "Dependencias", "Enrutamiento"] },
  { layer: "Validación y ejecución", modules: ["Sanitización", "Bounds", "Seed", "Versión"] },
  { layer: "Muestra pública del Lab", modules: ["Mathematics", "Finance", "Strategy", "Marketing"] },
  { layer: "Biblioteca cuantitativa", modules: ["16 modelos", "Escenarios", "Robustez", "Pareto"] },
  { layer: "Evidencia, estado y controles", modules: ["Etiquetas", "Procedencia", "Seguridad", "Accesibilidad"] },
] as const;

export const VALUE_TRANSFORMATION = [
  { input: "Tesis", output: "Universo de exploración" },
  { input: "Señales", output: "Problemas priorizados" },
  { input: "Hipótesis", output: "Modelos comparables" },
  { input: "Datos", output: "Evidencia trazable" },
  { input: "Incertidumbre", output: "Escenarios y experimentos" },
  { input: "Criterios", output: "Ranking explicable" },
] as const;

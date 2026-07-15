export const FRAMEWORK_GROUPS = [
  {
    category: "Descubrimiento",
    outcome: "Encontrar el problema correcto antes de optimizar la solución.",
    items: ["Jobs To Be Done", "Design Thinking", "Behavioral Economics", "Systems Thinking"],
  },
  {
    category: "Diseño",
    outcome: "Traducir evidencia en una configuración de valor testeable.",
    items: ["Business Model Canvas", "Lean Canvas", "Value Chain", "Theory of Constraints"],
  },
  {
    category: "Estrategia",
    outcome: "Definir dónde competir, qué no hacer y qué capacidades importan.",
    items: ["Blue Ocean Strategy", "Resource-Based View", "Porter’s Five Forces"],
  },
  {
    category: "Validación",
    outcome: "Comprar aprendizaje con el mínimo tiempo y capital posibles.",
    items: ["Lean Startup", "Validated Learning", "MVP", "Build–Measure–Learn"],
  },
  {
    category: "Escalamiento",
    outcome: "Evaluar adopción, defensibilidad y dinámica de sistemas complejos.",
    items: ["Crossing the Chasm", "Platform Economics", "Network Effects", "Disruptive Innovation"],
  },
] as const;

export const BLUE_OCEAN_FACTORS = [
  { label: "Complejidad operativa", incumbent: 82, concept: 34 },
  { label: "Costo de investigación", incumbent: 74, concept: 42 },
  { label: "Trazabilidad", incumbent: 28, concept: 88 },
  { label: "Amplitud de hipótesis", incumbent: 32, concept: 80 },
  { label: "Supervisión configurable", incumbent: 45, concept: 90 },
] as const;

export const ERRC = [
  { action: "Eliminar", items: ["Documentos aislados", "Scores sin explicación"] },
  { action: "Reducir", items: ["Trabajo repetitivo", "Dependencia de memoria tácita"] },
  { action: "Incrementar", items: ["Trazabilidad", "Diversidad de escenarios"] },
  { action: "Crear", items: ["Memoria de inversión", "Pipeline auditable multiagente"] },
] as const;

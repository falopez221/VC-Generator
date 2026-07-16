export const MARKET_SIGNALS = [
  {
    value: "USD 320B",
    label: "VC desplegado en EE.UU. durante 2025",
    detail: "15.352 operaciones; las cinco mayores rondas concentraron cerca de USD 60B.",
    source: "NVCA 2026 Yearbook",
  },
  {
    value: "−73,2%",
    label: "Valor de Q1 2026 al excluir las cinco mayores operaciones",
    detail: "La concentración, no el promedio, domina la lectura del mercado.",
    source: "PitchBook–NVCA Venture Monitor, Q1 2026",
  },
  {
    value: "88%",
    label: "Adopción organizacional de IA en la muestra del AI Index",
    detail: "El uso de agentes seguía en dígitos bajos en la mayoría de funciones.",
    source: "Stanford AI Index 2026",
  },
] as const;

export const AUTOMATION_BOUNDARY = [
  { stage: "Tesis y landscape", assist: "Búsqueda, síntesis, taxonomías y escenarios", human: "Convicción, contexto y responsabilidad fiduciaria" },
  { stage: "Sourcing y screening", assist: "Priorización, deduplicación, señales y memos", human: "Relaciones, reputación y acceso privado" },
  { stage: "Diligencia inicial", assist: "Mercado, técnica, economía, riesgo y preguntas", human: "Verificación, negociación y material no observable" },
  { stage: "Fundadores", assist: "Preguntas y consistencia documental", human: "Carácter, ética, liderazgo y dinámica del equipo" },
  { stage: "Decisión", assist: "Comparación, disenso, trazabilidad y escenarios", human: "Voto, accountability, cartera y términos" },
] as const;

export const OPERATING_FUNNEL = [
  { value: "1.000", label: "hipótesis" },
  { value: "700", label: "familias únicas" },
  { value: "200", label: "puerta básica" },
  { value: "60", label: "análisis profundos" },
  { value: "15", label: "simulación + revisión crítica" },
  { value: "5", label: "experimentos" },
  { value: "1–3", label: "decisiones humanas" },
] as const;

export const WHITEPAPER_DOMAINS = [
  { index: "I", title: "Sistema", chapters: "Problema · Principios · Arquitectura · 20 roles" },
  { index: "II", title: "Decisión", chapters: "Frameworks · Matemática · Algoritmos · Ranking" },
  { index: "III", title: "Producto", chapters: "Software · Operación · Negocio · Go-to-market" },
  { index: "IV", title: "Gobierno", chapters: "Roadmap · Riesgos · Extensiones · Datos y fuentes" },
] as const;

export const WHITEPAPER_META = {
  version: "1.0",
  date: "Julio de 2026",
  pages: 57,
  chapters: 16,
  northStar: "Maximizar la reducción de incertidumbre relevante por unidad de tiempo, costo y riesgo, preservando la decisión humana.",
} as const;

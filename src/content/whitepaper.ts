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
  { value: "1", label: "input humano" },
  { value: "6–12", label: "oportunidades sintéticas" },
  { value: "4", label: "agentes públicos" },
  { value: "14", label: "modelos visibles" },
  { value: "1", label: "ranking comparable" },
  { value: "1", label: "revisión humana" },
] as const;

export const WHITEPAPER_DOMAINS = [
  { index: "I", title: "Alcance público", chapters: "Auditoría · Frontera IP · Flujo reproducible" },
  { index: "II", title: "Muestra del Lab", chapters: "Mathematics · Finance · Strategy · Marketing" },
  { index: "III", title: "Decisión", chapters: "14 modelos · Gates · Dashboard · Ranking responsable" },
  { index: "IV", title: "Gobierno", chapters: "Seguridad · Calidad · Roadmap · Trazabilidad" },
] as const;

export const WHITEPAPER_META = {
  version: "2026.2",
  date: "Julio de 2026",
  pages: 36,
  chapters: 13,
  appendices: 4,
  northStar: "Maximizar la reducción de incertidumbre relevante por unidad de tiempo, costo y riesgo, preservando la decisión humana.",
} as const;

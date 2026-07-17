export type AgentGroup = "Cuantitativo" | "Economía" | "Estrategia" | "Mercado";

export type Agent = {
  id: string;
  name: "Mathematics" | "Finance" | "Strategy" | "Marketing";
  shortName: string;
  group: AgentGroup;
  phase: string;
  purpose: string;
  responsibilities: string[];
  inputs: string[];
  outputs: string[];
  quality: string[];
  metrics: string[];
  limits: string;
  connectsTo: string[];
};

export const AGENT_GROUPS: AgentGroup[] = ["Cuantitativo", "Economía", "Estrategia", "Mercado"];

/**
 * Public agent surface. Orchestration, ranking, persistence and validation are
 * deterministic modules, not additional public agents.
 */
export const AGENTS: Agent[] = [
  {
    id: "mathematics",
    name: "Mathematics",
    shortName: "Mathematics",
    group: "Cuantitativo",
    phase: "Modelado y robustez",
    purpose: "Convertir supuestos visibles en comparaciones reproducibles y comprobar si una conclusión resiste cambios razonables.",
    responsibilities: ["Normalizar pesos y rangos", "Medir sensibilidad e incertidumbre", "Detectar resultados no informativos"],
    inputs: ["Dimensiones 0-100", "Pesos públicos", "Riesgos", "Evidencia", "Semilla"],
    outputs: ["Score comparativo", "Intervalos y percentiles", "Drivers", "Estabilidad", "Límites"],
    quality: ["Reproducibilidad", "Parsimonia", "Rangos finitos", "Explicabilidad"],
    metrics: ["Sensibilidad", "Disagreement", "Incertidumbre", "Retención top-k"],
    limits: "No predice éxito real, no usa la fórmula privada y se abstiene cuando la muestra o los datos no son informativos.",
    connectsTo: ["finance", "strategy", "marketing"],
  },
  {
    id: "finance",
    name: "Finance",
    shortName: "Finance",
    group: "Economía",
    phase: "Economía unitaria",
    purpose: "Hacer visibles las condiciones económicas necesarias para que una oportunidad sintética pueda financiar su validación.",
    responsibilities: ["Modelar contribución y break-even", "Explorar downside y capital temprano", "Declarar unidades y supuestos"],
    inputs: ["Precio", "CAC", "Churn", "Margen", "Capital", "Horizonte"],
    outputs: ["Contribución retenida", "Clientes de equilibrio", "Payback", "Alertas", "Supuestos"],
    quality: ["Unidades explícitas", "Coherencia", "Trazabilidad", "Stress testing"],
    metrics: ["Margen", "Payback", "Capital requerido", "Probabilidad simulada de pérdida"],
    limits: "No produce una valoración, contabilidad ni asesoramiento financiero; todos los importes son escenarios demostrativos.",
    connectsTo: ["mathematics", "strategy", "marketing"],
  },
  {
    id: "strategy",
    name: "Strategy",
    shortName: "Strategy",
    group: "Estrategia",
    phase: "Elecciones y secuencia",
    purpose: "Evaluar el encaje entre problema, capacidades, timing, competencia y una secuencia reversible de experimentos.",
    responsibilities: ["Comparar alternativas", "Exponer dependencias y trade-offs", "Definir hitos y criterios de abandono"],
    inputs: ["Problema", "Tesis", "Alternativas", "Restricciones", "Timing", "Evidencia"],
    outputs: ["Opciones estratégicas", "Dependencias", "Riesgos", "Hitos", "Criterios de pausa"],
    quality: ["Claridad de elección", "Reversibilidad", "Contraste", "Evidencia diferencial"],
    metrics: ["Tiempo a aprendizaje", "Opcionalidad", "Alternativas no dominadas"],
    limits: "No demuestra defensibilidad, no observa planes privados de competidores y no ejecuta una empresa.",
    connectsTo: ["mathematics", "finance", "marketing"],
  },
  {
    id: "marketing",
    name: "Marketing",
    shortName: "Marketing",
    group: "Mercado",
    phase: "Cliente y adopción",
    purpose: "Evaluar si existe un segmento definible, un problema verificable y una ruta de adquisición que pueda probarse con bajo costo.",
    responsibilities: ["Precisar ICP y JTBD", "Diseñar hipótesis de mensaje y canal", "Priorizar evidencia de demanda"],
    inputs: ["ICP", "JTBD", "Mensaje", "Canal", "Pricing", "Conversión", "Retención"],
    outputs: ["Hipótesis de cliente", "Posicionamiento", "Canales", "Experimentos", "Riesgos de adopción"],
    quality: ["Segmentación", "Conducta observable", "Testeabilidad", "Costo de aprendizaje"],
    metrics: ["Conversión observada", "Concentración de canal", "Retención", "Costo por aprendizaje"],
    limits: "No transforma demanda sintética en voluntad de pago ni garantiza una adquisición eficiente.",
    connectsTo: ["mathematics", "finance", "strategy"],
  },
];

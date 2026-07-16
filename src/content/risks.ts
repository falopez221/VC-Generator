export const RISKS = [
  { risk: "Trazabilidad de evidencia", control: "Retrieval cerrado, citas verificadas, esquema y abstención explícita." },
  { risk: "Correlación de modelos", control: "Evaluadores independientes, reglas y muestreo de descartes para evitar consenso aparente." },
  { risk: "Precisión aparente", control: "Rangos, niveles de confianza y separación entre hecho e hipótesis." },
  { risk: "Prompt injection", control: "Separar datos e instrucciones, tool gateway, sandbox y allowlists." },
  { risk: "Fuga de datos", control: "RBAC, cifrado, egress control, segregación por tenant y redacción." },
  { risk: "Agency excesiva", control: "Read-only por defecto, approvals, límites y kill switch." },
  { risk: "Costo no acotado", control: "Budgets, turn limits, circuit breakers y caché versionado." },
  { risk: "Información de origen no verificada", control: "Triangulación, verificación externa y revisión crítica independiente." },
  { risk: "DeFi y token risk", control: "Simulación, auditoría, límites y ausencia de ejecución autónoma." },
  { risk: "Evaluación de fundadores", control: "Interacción humana, referencias y juicio sobre ética, liderazgo y dinámica." },
] as const;

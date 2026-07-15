export const ROADMAP = [
  { stage: "Validación del problema", status: "6–8 semanas", capability: "20–30 entrevistas, benchmark histórico, threat model y política de datos." },
  { stage: "MVP", status: "10–14 semanas", capability: "6 runtimes, 20 roles lógicos, evidencia, deduplicación, memo y audit log; read-only." },
  { stage: "Pilotos", status: "4–6 meses", capability: "Tres clientes, uno o dos verticales, simulación, Red Team y experimentos Lean." },
  { stage: "Enterprise", status: "6–12 meses", capability: "SSO, RBAC, aislamiento por tenant, policy engine, incident response y auditoría." },
  { stage: "Learning system", status: "12–24 meses", capability: "Outcome labels, calibración longitudinal, priors sectoriales y aprendizaje de routing." },
] as const;

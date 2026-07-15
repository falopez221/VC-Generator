export const USE_CASES = [
  { audience: "Fondos de Venture Capital", use: "Aumentar sourcing, comparabilidad y preparación del comité.", shift: "De documentos heterogéneos a memos trazables." },
  { audience: "Venture Studios", use: "Generar, contrastar y secuenciar tesis de creación.", shift: "De ideación abierta a portafolios de experimentos." },
  { audience: "Corporate Venture Capital", use: "Conectar señales externas con capacidades y prioridades internas.", shift: "De radar aislado a opciones estratégicas comparables." },
  { audience: "Bancos y Private Equity", use: "Estructurar investigación sectorial y riesgos de transformación.", shift: "De screening manual a análisis asistido y auditable." },
  { audience: "Aceleradoras e incubadoras", use: "Detectar brechas y diseñar rutas de validación por cohorte.", shift: "De mentoría genérica a evidencia por hipótesis." },
  { audience: "Fintech y protocolos DeFi", use: "Probar incentivos, gobernanza y vectores de ataque económico.", shift: "De tokenomics estática a escenarios adversariales." },
  { audience: "Equipos de innovación", use: "Administrar señales, oportunidades y experimentos con un lenguaje común.", shift: "De backlog de ideas a cartera de incertidumbre." },
  { audience: "Consultoras y laboratorios", use: "Acelerar síntesis sin perder fuentes, supuestos ni disenso.", shift: "De entregable final a proceso reproducible." },
] as const;

export const BUSINESS_MODEL = [
  { label: "Analyst Workspace", value: "Research, clasificación, memos, scorecards y evidencia; suscripción por equipo más uso." },
  { label: "Venture Studio Lab", value: "Generación, simulación y experimentos; contrato anual más módulos cuantitativos." },
  { label: "Enterprise Governed", value: "RBAC, SSO, private data, políticas y auditoría; licencia e implementación." },
  { label: "API / Modules", value: "Deduplicación, ranking, evidence graph, quant o Red Team; consumo y mínimo anual." },
  { label: "Wedge recomendado", value: "Screening y memo trazable en un dominio estrecho, no generación masiva como feature aislada." },
  { label: "Moat potencial", value: "Outcome data, calibración por dominio, workflow integrado, ontología, seguridad y confianza." },
] as const;

export type DomainVisualGroup = "network" | "map" | "pipeline" | "flow" | "matrix";
export type DomainKpiTone = "positive" | "neutral" | "watch" | "critical";

export type DomainKpi = {
  label: string;
  value: number;
  unit: string;
  decimals?: number;
  trend: string;
  tone: DomainKpiTone;
  context: string;
};

export type DomainModel = {
  name: string;
  purpose: string;
  limitation: string;
};

export type DomainSource = {
  name: string;
  kind: string;
  freshness: string;
  limitation: string;
};

export type DomainRole = {
  name: string;
  focus: string;
  output: string;
};

export type DomainScenario = {
  name: string;
  assumption: string;
  inputLabel: string;
  inputUnit: string;
  min: number;
  max: number;
  step: number;
  baseline: number;
  primaryLabel: string;
  primaryUnit: string;
  primaryBase: number;
  primarySensitivity: number;
  primaryMin: number;
  primaryMax: number;
  secondaryLabel: string;
  secondaryUnit: string;
  secondaryBase: number;
  secondarySensitivity: number;
  secondaryMin: number;
  secondaryMax: number;
};

export type DomainWorkspaceDefinition = {
  slug: string;
  domain: string;
  name: string;
  title: string;
  summary: string;
  visualGroup: DomainVisualGroup;
  visualMode: string;
  accent: string;
  accentAlt: string;
  vocabulary: string[];
  kpis: DomainKpi[];
  chart: {
    title: string;
    summary: string;
    labels: string[];
    values: number[];
    unit: string;
  };
  nodes: { label: string; value: string; tone: DomainKpiTone }[];
  models: DomainModel[];
  sources: DomainSource[];
  roles: DomainRole[];
  scenario: DomainScenario;
  risks: string[];
  opportunities: string[];
  safetyNote?: string;
};

const kpi = (label: string, value: number, unit: string, trend: string, tone: DomainKpiTone, context: string, decimals = 0): DomainKpi =>
  ({ label, value, unit, trend, tone, context, decimals });
const model = (name: string, purpose: string, limitation: string): DomainModel => ({ name, purpose, limitation });
const source = (name: string, kind: string, freshness: string, limitation: string): DomainSource => ({ name, kind, freshness, limitation });
const role = (name: string, focus: string, output: string): DomainRole => ({ name, focus, output });
const node = (label: string, value: string, tone: DomainKpiTone = "neutral") => ({ label, value, tone });

export const DOMAIN_WORKSPACES: readonly DomainWorkspaceDefinition[] = [
  {
    slug: "ai-software", domain: "AI & Software", name: "AI Systems Observatory", title: "Capacidad, adopcion y costo del ecosistema de IA", summary: "Observa modelos, agentes, infraestructura y adopcion empresarial sin confundir benchmarks con aptitud para produccion.", visualGroup: "network", visualMode: "ecosystem-radar", accent: "#72e0ff", accentAlt: "#7b8cff", vocabulary: ["inferencia", "evaluacion", "SLO", "guardrail"],
    kpis: [kpi("Costo por 1M tokens", 4.8, "USD", "-7% simulado", "positive", "Estimacion sintetica ponderada", 1), kpi("Latencia p95", 820, "ms", "+34 ms", "watch", "Carga empresarial ficticia"), kpi("Evaluaciones aprobadas", 78, "%", "+4 pp", "positive", "Suite publica de ejemplo"), kpi("Modelos en observacion", 12, "", "3 con alerta", "neutral", "Catalogo sintetico")],
    chart: { title: "Curva capacidad / costo", summary: "La capacidad simulada mejora mientras el costo unitario desciende; la serie no compara proveedores reales.", labels: ["E-5", "E-4", "E-3", "E-2", "E-1", "Ahora"], values: [42, 49, 58, 66, 74, 81], unit: "indice" },
    nodes: [node("Modelos fundacionales", "4 familias"), node("Agentes", "9 patrones", "positive"), node("Compute", "68% reservado", "watch"), node("Evaluacion", "78% pass"), node("Seguridad", "2 gaps", "critical")],
    models: [model("Matriz capacidad-costo", "Comparar configuraciones", "Los benchmarks no representan todos los usos"), model("Curva de adopcion", "Estimar difusion interna", "Supone cohortes estables"), model("Stress test de inferencia", "Explorar picos de demanda", "No sustituye una prueba de carga real")],
    sources: [source("Evaluaciones de laboratorio", "Observado sintetico", "T-24 h", "Suite reducida"), source("Telemetria de inferencia", "Simulado", "T-15 min", "Sin trafico real"), source("Encuesta de adopcion", "Estimado", "Trimestral", "Muestra ficticia")],
    roles: [role("Model Systems Analyst", "Benchmarks y arquitectura", "Mapa capacidad-costo"), role("AI Economics Reviewer", "Costo total de inferencia", "Escenarios de unidad economica"), role("Model Risk Steward", "Evaluacion y controles", "Registro de limites")],
    scenario: { name: "Presion de inferencia", assumption: "La carga cambia sin modificar la mezcla de modelos.", inputLabel: "Demanda relativa", inputUnit: "%", min: 60, max: 160, step: 5, baseline: 100, primaryLabel: "Latencia p95", primaryUnit: "ms", primaryBase: 820, primarySensitivity: 6.2, primaryMin: 420, primaryMax: 1400, secondaryLabel: "Costo mensual", secondaryUnit: "k USD", secondaryBase: 96, secondarySensitivity: 0.84, secondaryMin: 35, secondaryMax: 155 },
    risks: ["Concentracion de proveedor", "Degradacion silenciosa de evaluaciones"], opportunities: ["Enrutamiento por complejidad", "Caching y lotes para tareas no urgentes"]
  },
  {
    slug: "agriculture", domain: "Agriculture", name: "Field Yield Command", title: "Rendimiento, agua y riesgo agronomico por parcela", summary: "Combina capas de cultivo, clima, suelo y logistica para priorizar excepciones de campana.", visualGroup: "map", visualMode: "field-map", accent: "#b5e56b", accentAlt: "#5abf81", vocabulary: ["lote", "NDVI", "humedad", "rinde"],
    kpis: [kpi("Rinde estimado", 6.7, "t/ha", "+0.3", "positive", "Estimacion sintetica", 1), kpi("Agua disponible", 61, "%", "-8 pp", "watch", "Perfil de suelo simulado"), kpi("Lotes en riesgo", 4, "", "+1", "critical", "Umbral demostrativo"), kpi("Costo de insumos", 438, "USD/ha", "+2.1%", "neutral", "Precios ficticios")],
    chart: { title: "Evolucion de rendimiento", summary: "Rendimiento estimado de seis cortes sinteticos con intervalo no representado.", labels: ["S1", "S2", "S3", "S4", "S5", "S6"], values: [52, 57, 61, 58, 66, 71], unit: "indice" },
    nodes: [node("Lote Norte", "Humedad 72%", "positive"), node("Lote Este", "Estres hidrico", "critical"), node("Lote Sur", "Fertilizacion 82%"), node("Silo 03", "Capacidad 64%"), node("Ruta B", "Demora 1.8 h", "watch")],
    models: [model("Pronostico de rinde", "Combinar clima y suelo", "No captura microclimas reales"), model("Balance hidrico", "Explorar deficit de agua", "Parametros agronomicos ficticios"), model("Monte Carlo logistico", "Estimar ventanas de cosecha", "No incorpora contratos reales")],
    sources: [source("Sensores de parcela", "Observado sintetico", "T-2 h", "Sin ubicaciones reales"), source("Pronostico meteorologico", "Escenario", "Diario", "Trayectoria ficticia"), source("Mercado de commodities", "Estimado", "T-1 dia", "Precio demostrativo")],
    roles: [role("Agronomy Analyst", "Cultivo y sanidad", "Mapa de excepciones"), role("Water Scenario Reviewer", "Disponibilidad hidrica", "Balance por lote"), role("Supply Chain Planner", "Cosecha y almacenamiento", "Ventana logistica")],
    scenario: { name: "Deficit de precipitacion", assumption: "El manejo y el area sembrada permanecen constantes.", inputLabel: "Lluvia vs. normal", inputUnit: "%", min: 45, max: 125, step: 5, baseline: 100, primaryLabel: "Rinde esperado", primaryUnit: "t/ha", primaryBase: 6.7, primarySensitivity: 0.035, primaryMin: 3.8, primaryMax: 7.8, secondaryLabel: "Demanda de riego", secondaryUnit: "mm", secondaryBase: 74, secondarySensitivity: -1.05, secondaryMin: 18, secondaryMax: 132 },
    risks: ["Sequedad en floracion", "Cuello de botella de almacenamiento"], opportunities: ["Riego dirigido por excepcion", "Reasignacion temprana de transporte"]
  },
  {
    slug: "biotechnology", domain: "Biotechnology", name: "Translational Pipeline", title: "Pipeline cientifico, regulatorio y de probabilidad de exito", summary: "Sigue programas desde descubrimiento hasta validacion, con evidencia, hitos y riesgo visibles.", visualGroup: "pipeline", visualMode: "clinical-pipeline", accent: "#ff9bd2", accentAlt: "#8c78ff", vocabulary: ["target", "cohorte", "fase", "PoS"],
    kpis: [kpi("Programas activos", 14, "", "+2", "neutral", "Cartera sintetica"), kpi("PoS ponderada", 31, "%", "+3 pp", "positive", "Modelo demostrativo"), kpi("Runway de I+D", 19, "meses", "-1 mes", "watch", "Burn ficticio"), kpi("Hitos criticos", 5, "", "2 proximos", "critical", "Ventana 90 dias")],
    chart: { title: "Madurez del pipeline", summary: "Indice sintetico de avance por corte; no representa eficacia clinica.", labels: ["Desc.", "Preclin.", "Fase I", "Fase II", "Fase III", "Reg."], values: [92, 68, 43, 27, 13, 7], unit: "% programas" },
    nodes: [node("Descubrimiento", "5 programas"), node("Preclinica", "4 programas", "positive"), node("Fase I", "2 programas"), node("Fase II", "2 programas", "watch"), node("Regulatorio", "1 programa", "critical")],
    models: [model("Bayesian PoS", "Actualizar probabilidad con evidencia", "Priors ilustrativos"), model("Real options", "Valorar decisiones de continuar", "No es una valuacion de inversion"), model("Riesgo-retorno terapeutico", "Comparar programas", "Datos y pesos ficticios")],
    sources: [source("Registro de estudios", "Sintetico", "Semanal", "Sin pacientes reales"), source("Hitos de laboratorio", "Observado sintetico", "T-24 h", "Sin cuadernos privados"), source("Mapa de patentes", "Estimado", "Mensual", "Cobertura reducida")],
    roles: [role("Translational Science Analyst", "Evidencia preclinica", "Dossier de madurez"), role("Clinical Portfolio Reviewer", "Fases y dependencias", "Mapa de hitos"), role("Regulatory Strategy Steward", "Rutas regulatorias", "Registro de supuestos")],
    scenario: { name: "Probabilidad de exito", assumption: "El costo por etapa y el calendario permanecen constantes.", inputLabel: "Fuerza de evidencia", inputUnit: "indice", min: 40, max: 90, step: 5, baseline: 65, primaryLabel: "PoS ponderada", primaryUnit: "%", primaryBase: 31, primarySensitivity: 0.72, primaryMin: 12, primaryMax: 52, secondaryLabel: "Valor opcional", secondaryUnit: "indice", secondaryBase: 58, secondarySensitivity: 0.9, secondaryMin: 30, secondaryMax: 84 },
    risks: ["Traslacion debil entre etapas", "Hito regulatorio concentrado"], opportunities: ["Biomarcador para enriquecer cohortes", "Acuerdo de co-desarrollo"]
  },
  {
    slug: "blockchain", domain: "Blockchain", name: "Protocol Observatory", title: "Liquidez, gobernanza y riesgo de protocolos", summary: "Expone flujo de capital, actividad agregada y dependencias de contratos sin habilitar operaciones on-chain.", visualGroup: "network", visualMode: "protocol-network", accent: "#a98cff", accentAlt: "#5ee1d0", vocabulary: ["TVL", "puente", "quorum", "slippage"],
    kpis: [kpi("TVL sintetico", 482, "M USD", "+6.4%", "positive", "Sin activos reales"), kpi("Liquidez util", 71, "%", "-2 pp", "watch", "Profundidad simulada"), kpi("Participacion gobernanza", 38, "%", "+5 pp", "neutral", "Votacion ficticia"), kpi("Dependencias criticas", 3, "", "1 nueva", "critical", "Grafo demostrativo")],
    chart: { title: "Flujo de capital", summary: "Indice ficticio de entradas netas; no es informacion de mercado ni recomendacion financiera.", labels: ["T-5", "T-4", "T-3", "T-2", "T-1", "Ahora"], values: [48, 54, 51, 63, 68, 73], unit: "indice" },
    nodes: [node("Core protocol", "TVL 61%", "positive"), node("Bridge A", "Riesgo medio", "watch"), node("Oracle set", "3 proveedores"), node("DAO", "Quorum 38%"), node("Pool B", "Slippage alto", "critical")],
    models: [model("Simulacion tokenomics", "Explorar incentivos", "No predice precios"), model("Stress test de liquidez", "Medir salidas abruptas", "Profundidad sintetica"), model("Grafo de dependencias", "Detectar concentracion", "Contratos ficticios")],
    sources: [source("Actividad on-chain agregada", "Sintetico", "T-30 min", "Sin wallets reales"), source("Gobernanza", "Simulado", "T-24 h", "Sin votos reales"), source("Liquidez de mercado", "Estimado", "T-15 min", "No apto para trading")],
    roles: [role("Protocol Economics Analyst", "Incentivos y emisiones", "Escenario tokenomico"), role("Liquidity Risk Reviewer", "Profundidad y salidas", "Stress test"), role("Smart Contract Dependency Steward", "Dependencias tecnicas", "Mapa de exposicion")],
    scenario: { name: "Salida de liquidez", assumption: "No hay intervenciones de gobernanza durante la ventana.", inputLabel: "Liquidez retirada", inputUnit: "%", min: 0, max: 55, step: 5, baseline: 15, primaryLabel: "Slippage estimado", primaryUnit: "%", primaryBase: 2.4, primarySensitivity: 0.19, primaryMin: 0.5, primaryMax: 11.5, secondaryLabel: "Cobertura colateral", secondaryUnit: "%", secondaryBase: 142, secondarySensitivity: -1.15, secondaryMin: 92, secondaryMax: 160 },
    risks: ["Dependencia de puente", "Gobernanza concentrada"], opportunities: ["Diversificar oraculos", "Profundidad incentivada por tramos"]
  },
  {
    slug: "cities", domain: "Cities", name: "Urban Systems Twin", title: "Movilidad, vivienda y servicios en una vista urbana multicapa", summary: "Compara condiciones actuales y escenarios de crecimiento usando solo datos urbanos agregados y sinteticos.", visualGroup: "map", visualMode: "urban-multilayer", accent: "#5fd6ff", accentAlt: "#ffbf69", vocabulary: ["manzana", "modal split", "cobertura", "densidad"],
    kpis: [kpi("Tiempo medio de viaje", 34, "min", "-2 min", "positive", "Red sintetica"), kpi("Cobertura de servicios", 87, "%", "+1 pp", "positive", "Radio demostrativo"), kpi("Brecha habitacional", 18, "k hogares", "+0.8k", "critical", "Estimacion ficticia"), kpi("Obras en riesgo", 6, "", "2 criticas", "watch", "Portafolio simulado")],
    chart: { title: "Demanda urbana por corredor", summary: "Indice agregado de demanda para seis corredores ficticios.", labels: ["Norte", "Este", "Centro", "Oeste", "Sur", "Anillo"], values: [61, 74, 93, 58, 67, 52], unit: "indice" },
    nodes: [node("Distrito Centro", "Densidad alta", "watch"), node("Corredor Este", "Trafico +18%", "critical"), node("Nodo Salud", "Cobertura 92%", "positive"), node("Proyecto H-07", "En revision"), node("Red de agua", "Capacidad 76%", "watch")],
    models: [model("Modelo de uso del suelo", "Explorar densidad", "No predice comportamiento parcelario"), model("Asignacion de trafico", "Comparar corredores", "Red simplificada"), model("Escenario de servicios", "Medir cobertura", "Demanda sintetica")],
    sources: [source("Movilidad agregada", "Sintetico", "T-1 h", "Sin trazas individuales"), source("Catastro demostrativo", "Simulado", "Mensual", "Sin parcelas reales"), source("Capacidad de servicios", "Estimado", "Semanal", "Infraestructura abstraida")],
    roles: [role("Urban Mobility Analyst", "Corredores y accesibilidad", "Mapa de friccion"), role("Housing Scenario Reviewer", "Oferta y densidad", "Escenario habitacional"), role("Public Services Planner", "Cobertura y capacidad", "Brechas territoriales")],
    scenario: { name: "Crecimiento del corredor Este", assumption: "La red primaria conserva su capacidad actual.", inputLabel: "Nuevos hogares", inputUnit: "k", min: 0, max: 35, step: 2.5, baseline: 10, primaryLabel: "Tiempo de viaje", primaryUnit: "min", primaryBase: 34, primarySensitivity: 0.42, primaryMin: 28, primaryMax: 47, secondaryLabel: "Cobertura de servicios", secondaryUnit: "%", secondaryBase: 87, secondarySensitivity: -0.36, secondaryMin: 76, secondaryMax: 92 },
    risks: ["Capacidad vial saturada", "Desigualdad de acceso territorial"], opportunities: ["Desarrollo orientado al transporte", "Secuenciar infraestructura social"]
  },
  {
    slug: "climate", domain: "Climate", name: "Climate Exposure Ledger", title: "Exposicion de activos y trayectorias de transicion", summary: "Separa riesgo fisico, emisiones, adaptacion e incertidumbre metodologica en cada indicador.", visualGroup: "map", visualMode: "climate-exposure", accent: "#64e0c2", accentAlt: "#ff866e", vocabulary: ["Scope 3", "RCP", "hotspot", "adaptacion"],
    kpis: [kpi("Activos expuestos", 23, "%", "+2 pp", "critical", "Escenario sintetico"), kpi("Emisiones", 184, "ktCO2e", "-6.1%", "positive", "Inventario ficticio"), kpi("Datos estimados", 41, "%", "-3 pp", "watch", "Calidad metodologica"), kpi("Brecha de adaptacion", 62, "M USD", "+4M", "critical", "Costo demostrativo")],
    chart: { title: "Trayectoria de emisiones", summary: "Serie sintetica frente a un objetivo ilustrativo, sin valor de reporte regulatorio.", labels: ["2024", "2025", "2026", "2027", "2028", "2030"], values: [100, 94, 88, 79, 70, 55], unit: "indice" },
    nodes: [node("Costa", "Inundacion alta", "critical"), node("Cuenca Norte", "Sequia media", "watch"), node("Planta A", "Calor alto", "critical"), node("Portfolio B", "Transicion 72%", "positive"), node("Proveedor C", "Dato estimado", "watch")],
    models: [model("Escenario climatico", "Explorar horizontes", "No es pronostico local"), model("Valor en riesgo fisico", "Priorizar exposicion", "Valuaciones sinteticas"), model("Curva marginal de abatimiento", "Comparar acciones", "Costos ilustrativos")],
    sources: [source("Inventario de emisiones", "Mixto sintetico", "Mensual", "41% estimado"), source("Capas de peligro", "Escenario", "Anual", "Resolucion reducida"), source("Registro de activos", "Sintetico", "Semanal", "Ubicaciones abstractas")],
    roles: [role("Physical Risk Analyst", "Peligros y activos", "Mapa de exposicion"), role("Transition Pathway Reviewer", "Emisiones y regulacion", "Trayectoria comparada"), role("Climate Data Steward", "Calidad y metodologia", "Registro de incertidumbre")],
    scenario: { name: "Trayectoria de calentamiento", assumption: "La composicion del portafolio no cambia.", inputLabel: "Calentamiento", inputUnit: "C", min: 1.5, max: 4, step: 0.25, baseline: 2.5, primaryLabel: "Activos expuestos", primaryUnit: "%", primaryBase: 23, primarySensitivity: 7.2, primaryMin: 12, primaryMax: 39, secondaryLabel: "Brecha adaptacion", secondaryUnit: "M USD", secondaryBase: 62, secondarySensitivity: 18, secondaryMin: 34, secondaryMax: 88 },
    risks: ["Subestimacion de eventos compuestos", "Dependencia de datos de proveedores"], opportunities: ["Adaptacion por hotspots", "Compras bajas en carbono"]
  },
  {
    slug: "corporate-strategy", domain: "Corporate Strategy", name: "Strategic Portfolio Room", title: "Mercados, capacidades y movimientos competitivos", summary: "Alinea objetivos, iniciativas, metricas y decisiones de portafolio con propietarios y evidencia.", visualGroup: "matrix", visualMode: "strategy-portfolio", accent: "#ffcf66", accentAlt: "#6fb4ff", vocabulary: ["value pool", "moat", "adjacency", "optionality"],
    kpis: [kpi("Valor en juego", 286, "M USD", "+18M", "positive", "Escenario ficticio"), kpi("Iniciativas fuera de ruta", 7, "", "+2", "critical", "Umbrales demo"), kpi("Capacidades listas", 68, "%", "+6 pp", "positive", "Autoevaluacion sintetica"), kpi("Opciones abiertas", 11, "", "3 vencen", "watch", "Cartera ilustrativa")],
    chart: { title: "Value pools por horizonte", summary: "Distribucion sintetica de valor potencial, no una proyeccion financiera.", labels: ["Core", "Adj. 1", "Adj. 2", "Nuevo", "Partner", "M&A"], values: [82, 64, 58, 47, 39, 31], unit: "indice" },
    nodes: [node("Defender core", "Alta certeza", "positive"), node("Expandir canal", "Capacidad media"), node("Nueva categoria", "Alto valor", "watch"), node("Alianza A", "Negociacion"), node("M&A opcion B", "Riesgo alto", "critical")],
    models: [model("Matriz de portafolio", "Comparar opciones", "Ejes y pesos visibles son ficticios"), model("Arbol de decision", "Secuenciar compromisos", "No captura todos los movimientos rivales"), model("War game competitivo", "Explorar respuestas", "Escenarios no predictivos")],
    sources: [source("Metricas operativas", "Observado sintetico", "Semanal", "Sin ERP real"), source("Senales competitivas", "Estimado", "Mensual", "Fuentes ficticias"), source("Mapa de capacidades", "Autoevaluacion", "Trimestral", "Sesgo de evaluador")],
    roles: [role("Market Structure Analyst", "Mercados y value pools", "Mapa de atractivo"), role("Competitive Strategy Reviewer", "Movimientos y respuestas", "Escenarios rivales"), role("Portfolio Governance Steward", "Opciones y gates", "Registro de decision")],
    scenario: { name: "Entrada a una adyacencia", assumption: "El negocio core mantiene su margen base.", inputLabel: "Inversion inicial", inputUnit: "M USD", min: 10, max: 90, step: 5, baseline: 45, primaryLabel: "Valor opcional", primaryUnit: "indice", primaryBase: 61, primarySensitivity: 0.48, primaryMin: 42, primaryMax: 82, secondaryLabel: "Exposicion de portafolio", secondaryUnit: "%", secondaryBase: 24, secondarySensitivity: 0.31, secondaryMin: 14, secondaryMax: 39 },
    risks: ["Canibalizacion del core", "Capacidad critica no disponible"], opportunities: ["Entrada por alianza", "Gate por evidencia antes de escalar"]
  },
  {
    slug: "culture-media", domain: "Culture & Media", name: "Narrative Signal Studio", title: "Audiencias, narrativas y redes de influencia", summary: "Distingue alcance, afinidad, difusion y sentimiento agregado sin perfilar personas.", visualGroup: "network", visualMode: "narrative-network", accent: "#ff8fc7", accentAlt: "#ffca66", vocabulary: ["afinidad", "share of voice", "cohorte", "narrativa"],
    kpis: [kpi("Alcance agregado", 8.4, "M", "+12%", "positive", "Audiencia ficticia", 1), kpi("Afinidad", 64, "%", "+3 pp", "positive", "Indice sintetico"), kpi("Narrativas emergentes", 5, "", "+2", "watch", "Clustering demo"), kpi("Riesgo reputacional", 27, "indice", "+8", "critical", "Senal agregada")],
    chart: { title: "Difusion de narrativas", summary: "Indice agregado por ventana; no identifica usuarios ni cuentas.", labels: ["T-5", "T-4", "T-3", "T-2", "T-1", "Ahora"], values: [31, 38, 44, 57, 71, 76], unit: "indice" },
    nodes: [node("Narrativa A", "Crecimiento 18%", "watch"), node("Audiencia Core", "Afinidad 78%", "positive"), node("Plataforma 1", "Alcance 42%"), node("Creator cluster", "12 nodos"), node("Riesgo B", "Acelerando", "critical")],
    models: [model("Red de influencia", "Mapear difusion agregada", "No infiere intenciones individuales"), model("Deteccion de tendencia", "Identificar cambios", "Sensibilidad a ventanas"), model("Segmentacion de audiencias", "Comparar cohortes", "Cohortes sinteticas")],
    sources: [source("Metricas de contenido", "Sintetico agregado", "T-6 h", "Sin identificadores"), source("Encuesta de audiencia", "Estimado", "Mensual", "Muestra ficticia"), source("Senales editoriales", "Curado", "Semanal", "Criterios demostrativos")],
    roles: [role("Narrative Analyst", "Temas y marcos", "Mapa narrativo"), role("Audience Intelligence Reviewer", "Cohortes y afinidad", "Funnel de engagement"), role("Reputation Risk Steward", "Riesgos agregados", "Cola de excepciones")],
    scenario: { name: "Intensidad de campana", assumption: "La mezcla de plataformas permanece constante.", inputLabel: "Inversion relativa", inputUnit: "%", min: 50, max: 180, step: 10, baseline: 100, primaryLabel: "Alcance", primaryUnit: "M", primaryBase: 8.4, primarySensitivity: 0.052, primaryMin: 5.5, primaryMax: 12.4, secondaryLabel: "Afinidad", secondaryUnit: "%", secondaryBase: 64, secondarySensitivity: -0.045, secondaryMin: 58, secondaryMax: 67 },
    risks: ["Amplificacion de narrativa adversa", "Fatiga de audiencia"], opportunities: ["Contenido por afinidad", "Deteccion temprana de temas"]
  },
  {
    slug: "cybersecurity", domain: "Cybersecurity", name: "Resilience Operations Center", title: "Exposicion, controles e incidentes priorizados por riesgo", summary: "Una consola SOC simulada que muestra excepciones y evidencia sin revelar activos, identidades ni vulnerabilidades reales.", visualGroup: "network", visualMode: "attack-surface", accent: "#55e6d2", accentAlt: "#ff6f78", vocabulary: ["MTTR", "blast radius", "control", "exposure"],
    kpis: [kpi("Exposicion explotable", 14, "%", "-3 pp", "positive", "Inventario ficticio"), kpi("MTTR", 7.8, "h", "+0.6 h", "watch", "Incidentes simulados", 1), kpi("Activos criticos", 19, "", "2 sin owner", "critical", "Topologia abstracta"), kpi("Cobertura de controles", 83, "%", "+2 pp", "positive", "Evidencia sintetica")],
    chart: { title: "Ventana de exposicion", summary: "Indice sintetico; no contiene IP, hostnames, usuarios ni detalles explotables.", labels: ["T-5", "T-4", "T-3", "T-2", "T-1", "Ahora"], values: [71, 66, 69, 58, 49, 44], unit: "indice" },
    nodes: [node("Identity plane", "2 controles gap", "critical"), node("Cloud edge", "Cobertura 91%", "positive"), node("Data tier", "Riesgo medio", "watch"), node("Third party", "1 dependencia"), node("Response", "SLA 86%")],
    models: [model("Attack graph abstracto", "Priorizar rutas de riesgo", "Sin topologia real"), model("Monte Carlo de incidentes", "Explorar perdida y tiempo", "Frecuencias ficticias"), model("Matriz control-activo", "Detectar gaps", "No prueba eficacia real")],
    sources: [source("Inventario de activos", "Sintetico", "T-1 h", "Sin identificadores tecnicos"), source("Evidencia de controles", "Simulado", "Diario", "Sin configuraciones"), source("Timeline de incidentes", "Ficticio", "T-15 min", "Sin datos de personas")],
    roles: [role("Exposure Analyst", "Rutas y activos", "Cola por riesgo"), role("Control Assurance Reviewer", "Cobertura y eficacia", "Mapa de gaps"), role("Incident Learning Steward", "Timeline y lecciones", "Registro post-incidente")],
    scenario: { name: "Capacidad de remediacion", assumption: "El volumen de nuevas exposiciones permanece estable.", inputLabel: "Tickets cerrados / semana", inputUnit: "", min: 8, max: 48, step: 4, baseline: 24, primaryLabel: "Exposicion explotable", primaryUnit: "%", primaryBase: 14, primarySensitivity: -0.38, primaryMin: 6, primaryMax: 21, secondaryLabel: "Backlog critico", secondaryUnit: "", secondaryBase: 19, secondarySensitivity: -0.55, secondaryMin: 7, secondaryMax: 28 },
    risks: ["Identidad con controles incompletos", "Dependencia de tercero no verificada"], opportunities: ["Remediacion por blast radius", "Automatizar solo evidencia de control"]
  },
  {
    slug: "defense", domain: "Defense", name: "Resilience Planning Cell", title: "Simulacion logistica y resiliencia institucional", summary: "Planifica recursos, rutas abstractas y dependencias con datos exclusivamente sinteticos y sin capacidad operacional.", visualGroup: "map", visualMode: "resilience-planning", accent: "#9eb7c7", accentAlt: "#e7b568", vocabulary: ["readiness", "reserva", "dependencia", "resiliencia"],
    kpis: [kpi("Disponibilidad simulada", 74, "%", "-2 pp", "watch", "Recursos ficticios"), kpi("Fill rate logistico", 88, "%", "+4 pp", "positive", "Escenario demo"), kpi("Rutas resilientes", 3, "", "1 degradada", "critical", "Geografia abstracta"), kpi("Dias de reserva", 26, "", "+2", "neutral", "Inventario sintetico")],
    chart: { title: "Sostenimiento por horizonte", summary: "Capacidad simulada sobre seis periodos; no representa fuerzas, rutas ni capacidades reales.", labels: ["D+0", "D+5", "D+10", "D+15", "D+20", "D+30"], values: [91, 87, 82, 74, 68, 61], unit: "%" },
    nodes: [node("Hub Alpha", "Capacidad 78%"), node("Ruta 1", "Disponible", "positive"), node("Ruta 2", "Degradada", "critical"), node("Reserva", "26 dias"), node("Dependencia X", "Alta", "watch")],
    models: [model("Simulacion logistica", "Explorar capacidad", "Activos y rutas ficticios"), model("Analisis de dependencias", "Medir resiliencia", "No contiene sistemas reales"), model("Stress test de abastecimiento", "Comparar reservas", "Supuestos visibles y reducidos")],
    sources: [source("Inventario abstracto", "Sintetico", "T-6 h", "Sin activos reales"), source("Red logistica ficticia", "Simulado", "T-1 h", "Sin coordenadas"), source("Escenario de demanda", "Estimado", "Por corrida", "Semilla reproducible")],
    roles: [role("Logistics Resilience Analyst", "Sostenimiento y capacidad", "Escenario de abastecimiento"), role("Dependency Reviewer", "Cuellos de botella", "Mapa de resiliencia"), role("Decision Trace Steward", "Supuestos y gates", "Registro auditable")],
    scenario: { name: "Interrupcion de ruta", assumption: "No se incorporan activos ni ubicaciones reales.", inputLabel: "Capacidad de ruta", inputUnit: "%", min: 35, max: 100, step: 5, baseline: 75, primaryLabel: "Fill rate", primaryUnit: "%", primaryBase: 88, primarySensitivity: 0.42, primaryMin: 70, primaryMax: 98, secondaryLabel: "Dias de reserva", secondaryUnit: "", secondaryBase: 26, secondarySensitivity: 0.31, secondaryMin: 14, secondaryMax: 34 },
    risks: ["Dependencia unica simulada", "Reserva insuficiente en escenario severo"], opportunities: ["Preposicionamiento abstracto", "Diversificacion de rutas en simulacion"], safetyNote: "Solo simulacion, investigacion y logistica con datos sinteticos. No controla armamento, no selecciona objetivos, no vigila personas y no ejecuta operaciones reales."
  },
  {
    slug: "education", domain: "Education", name: "Learning Pathways Monitor", title: "Trayectorias, retencion y demanda de habilidades", summary: "Prioriza cohortes y programas mediante resultados agregados, explicaciones y acciones humanas de apoyo.", visualGroup: "matrix", visualMode: "learning-pathways", accent: "#79b7ff", accentAlt: "#f7cf69", vocabulary: ["cohorte", "persistencia", "competencia", "trayectoria"],
    kpis: [kpi("Retencion", 84, "%", "+2 pp", "positive", "Cohorte sintetica"), kpi("Progreso esperado", 71, "%", "-1 pp", "watch", "Actividad agregada"), kpi("Programas con brecha", 6, "", "+1", "critical", "Demanda ficticia"), kpi("Empleabilidad", 76, "%", "+3 pp", "positive", "Estimacion demo")],
    chart: { title: "Trayectorias de cohorte", summary: "Indice de progresion agregado; no contiene registros individuales.", labels: ["Ingreso", "T1", "T2", "T3", "T4", "Final"], values: [100, 91, 86, 82, 78, 74], unit: "%" },
    nodes: [node("Cohorte A", "Ritmo 82%", "positive"), node("Cohorte B", "Riesgo 21%", "watch"), node("Programa Data", "Demanda alta", "positive"), node("Programa Ops", "Brecha 14%", "critical"), node("Mentorias", "Cobertura 67%")],
    models: [model("Riesgo de desercion agregado", "Priorizar apoyo", "No decide sobre estudiantes"), model("Forecast de habilidades", "Comparar demanda", "Horizonte incierto"), model("Asignacion MCDA", "Explorar recursos", "Pesos visibles y ficticios")],
    sources: [source("Resultados de aprendizaje", "Agregado sintetico", "Semanal", "Sin PII"), source("Actividad de curso", "Agregado", "T-24 h", "No seguimiento individual"), source("Demanda de habilidades", "Estimado", "Trimestral", "Mercado ficticio")],
    roles: [role("Learning Analytics Reviewer", "Progreso y retencion", "Mapa de cohortes"), role("Skills Demand Analyst", "Mercado laboral", "Radar de brechas"), role("Program Portfolio Steward", "Recursos y programas", "Opciones de asignacion")],
    scenario: { name: "Cobertura de apoyo", assumption: "Los criterios de riesgo y la composicion de cohortes se mantienen.", inputLabel: "Cobertura de mentoria", inputUnit: "%", min: 30, max: 95, step: 5, baseline: 65, primaryLabel: "Retencion", primaryUnit: "%", primaryBase: 84, primarySensitivity: 0.18, primaryMin: 77, primaryMax: 90, secondaryLabel: "Casos pendientes", secondaryUnit: "", secondaryBase: 42, secondarySensitivity: -0.82, secondaryMin: 17, secondaryMax: 71 },
    risks: ["Brecha de habilidades persistente", "Intervenciones con baja cobertura"], opportunities: ["Mentoria focalizada", "Redisenar programas por demanda"]
  },
  {
    slug: "emergency-response", domain: "Emergency Response", name: "Incident Coordination Board", title: "Incidentes, capacidad y coordinacion interinstitucional", summary: "Un common operating picture sintetico con colas, tiempos y trazabilidad, sin despachar recursos reales.", visualGroup: "map", visualMode: "incident-command", accent: "#ff8c69", accentAlt: "#ffd166", vocabulary: ["ETA", "refugio", "capacidad", "escalamiento"],
    kpis: [kpi("Incidentes abiertos", 17, "", "3 criticos", "critical", "Eventos ficticios"), kpi("Respuesta mediana", 9.4, "min", "-1.2 min", "positive", "Tiempos simulados", 1), kpi("Capacidad de refugio", 68, "%", "+8 pp", "neutral", "Escenario demo"), kpi("Recursos disponibles", 74, "%", "-6 pp", "watch", "Inventario abstracto")],
    chart: { title: "Carga de incidentes", summary: "Eventos agregados por ventana; no contiene llamadas, video ni ubicaciones reales.", labels: ["00h", "04h", "08h", "12h", "16h", "20h"], values: [18, 24, 47, 72, 61, 39], unit: "indice" },
    nodes: [node("Zona A", "Prioridad alta", "critical"), node("Hospital 1", "Capacidad 81%", "watch"), node("Refugio Norte", "68% libre", "positive"), node("Ruta C", "Demora 12 min", "watch"), node("Centro Ops", "Sincronizado")],
    models: [model("Queueing de respuesta", "Estimar espera", "No despacha recursos"), model("Optimizacion robusta", "Comparar ubicaciones", "Red sintetica"), model("Escenario multi-riesgo", "Explorar cascadas", "Eventos ficticios")],
    sources: [source("Registro de incidentes", "Sintetico agregado", "T-5 min", "Sin datos de personas"), source("Capacidad institucional", "Simulado", "T-15 min", "Sin telemetria real"), source("Capas de peligro", "Escenario", "T-1 h", "Geografia abstracta")],
    roles: [role("Incident Prioritization Analyst", "Cola y severidad", "Orden de revision"), role("Resource Capacity Reviewer", "Capacidad y tiempos", "Mapa de brechas"), role("Coordination Trace Steward", "Handoffs y decisiones", "Timeline auditable")],
    scenario: { name: "Pico de incidentes", assumption: "La red vial y los turnos permanecen constantes.", inputLabel: "Incidentes por hora", inputUnit: "", min: 4, max: 34, step: 2, baseline: 16, primaryLabel: "Respuesta mediana", primaryUnit: "min", primaryBase: 9.4, primarySensitivity: 0.43, primaryMin: 5.5, primaryMax: 17.5, secondaryLabel: "Recursos disponibles", secondaryUnit: "%", secondaryBase: 74, secondarySensitivity: -1.2, secondaryMin: 50, secondaryMax: 88 },
    risks: ["Saturacion de hospital simulado", "Dependencia de una ruta"], opportunities: ["Apertura escalonada de refugios", "Coordinacion anticipada de turnos"], safetyNote: "Demostracion read-only. No envia alertas, no despacha recursos y no reemplaza protocolos ni autoridades de emergencia."
  },
  {
    slug: "energy", domain: "Energy", name: "Grid Transition Console", title: "Oferta, demanda, activos y despacho demostrativo", summary: "Muestra flujos agregados, disponibilidad y riesgo de interrupcion sin exponer ni controlar infraestructura real.", visualGroup: "flow", visualMode: "grid-flow", accent: "#ffd35f", accentAlt: "#57c8ff", vocabulary: ["carga", "reserva", "curtailment", "N-1"],
    kpis: [kpi("Demanda", 4.7, "GW", "+0.3", "watch", "Carga sintetica", 1), kpi("Renovable", 42, "%", "+5 pp", "positive", "Mix ficticio"), kpi("Margen de reserva", 13, "%", "-2 pp", "critical", "Umbral demo"), kpi("Activos disponibles", 91, "%", "+1 pp", "positive", "Estado simulado")],
    chart: { title: "Demanda vs. oferta", summary: "Balance agregado para seis intervalos; no es telemetria de red ni instruccion de despacho.", labels: ["00h", "04h", "08h", "12h", "16h", "20h"], values: [54, 49, 68, 77, 93, 81], unit: "% pico" },
    nodes: [node("Solar", "1.2 GW", "positive"), node("Eolica", "0.8 GW"), node("Termica", "1.9 GW", "watch"), node("Storage", "64% SOC"), node("Carga industrial", "Pico 17h", "critical")],
    models: [model("Despacho lineal demo", "Comparar mix", "No controla activos"), model("Adecuacion Monte Carlo", "Explorar interrupciones", "Tasas ficticias"), model("Forecast de demanda", "Estimar picos", "Serie sintetica")],
    sources: [source("Demanda agregada", "Simulado", "T-5 min", "Sin SCADA"), source("Estado de activos", "Sintetico", "T-15 min", "Sin endpoints ni setpoints"), source("Precios y combustibles", "Estimado", "T-1 h", "No apto para mercado")],
    roles: [role("Power Systems Analyst", "Balance y reserva", "Vista de adecuacion"), role("Asset Reliability Reviewer", "Disponibilidad y fallas", "Cola de activos"), role("Transition Portfolio Steward", "Mix y emisiones", "Escenario de inversion")],
    scenario: { name: "Pico de demanda", assumption: "La disponibilidad de activos se mantiene en el valor base.", inputLabel: "Demanda pico", inputUnit: "GW", min: 3.8, max: 6.4, step: 0.2, baseline: 4.8, primaryLabel: "Margen de reserva", primaryUnit: "%", primaryBase: 13, primarySensitivity: -8.5, primaryMin: 3, primaryMax: 21, secondaryLabel: "Costo marginal", secondaryUnit: "USD/MWh", secondaryBase: 71, secondarySensitivity: 18, secondaryMin: 52, secondaryMax: 99 },
    risks: ["Margen de reserva estrecho", "Concentracion de combustible"], opportunities: ["Respuesta de demanda", "Almacenamiento en hora pico"], safetyNote: "Analitica read-only con topologia abstracta. No se muestran controles, endpoints, setpoints ni activos reales."
  },
  {
    slug: "finance", domain: "Finance", name: "Capital Risk Terminal", title: "Mercados, liquidez y exposicion con trazabilidad", summary: "Una interfaz financiera original de alta densidad para escenarios, riesgo y capital; no replica una terminal existente.", visualGroup: "flow", visualMode: "capital-terminal", accent: "#6ee7b7", accentAlt: "#6da8ff", vocabulary: ["VaR", "duration", "basis", "drawdown"],
    kpis: [kpi("NAV sintetico", 1.24, "B USD", "+1.8%", "positive", "Portafolio ficticio", 2), kpi("VaR 95%", 18.6, "M USD", "+2.1M", "critical", "Modelo demo", 1), kpi("Liquidez 30d", 73, "%", "-4 pp", "watch", "Supuesto de mercado"), kpi("Duration", 4.2, "anos", "+0.3", "neutral", "Curva ficticia", 1)],
    chart: { title: "Rendimiento acumulado", summary: "Serie sintetica; no es una cotizacion ni una recomendacion de inversion.", labels: ["T-5", "T-4", "T-3", "T-2", "T-1", "Ahora"], values: [100, 103, 99, 106, 111, 108], unit: "base 100" },
    nodes: [node("Rates", "Duration 4.2"), node("FX", "Riesgo medio", "watch"), node("Equity", "Beta 0.88"), node("Credit", "Spread +42", "critical"), node("Cash", "18%", "positive")],
    models: [model("VaR historico demo", "Resumir cola de perdida", "No cubre eventos fuera de muestra"), model("Monte Carlo macro", "Explorar factores", "Distribuciones ficticias"), model("Matriz de correlacion", "Detectar concentracion", "Correlaciones inestables")],
    sources: [source("Precios de mercado", "Sintetico", "T-15 min", "No apto para trading"), source("Posiciones agregadas", "Simulado", "T-1 h", "Sin cuentas reales"), source("Curva macro", "Escenario", "Diario", "Supuestos ficticios")],
    roles: [role("Market Risk Analyst", "Factores y VaR", "Mapa de exposicion"), role("Liquidity Reviewer", "Horizontes y salidas", "Escenario de liquidez"), role("Capital Allocation Steward", "Opciones y limites", "Registro de recomendacion")],
    scenario: { name: "Shock de tasas", assumption: "Las posiciones y correlaciones permanecen constantes.", inputLabel: "Movimiento de curva", inputUnit: "bps", min: -100, max: 250, step: 25, baseline: 0, primaryLabel: "Impacto NAV", primaryUnit: "M USD", primaryBase: 0, primarySensitivity: -0.082, primaryMin: -21, primaryMax: 9, secondaryLabel: "VaR 95%", secondaryUnit: "M USD", secondaryBase: 18.6, secondarySensitivity: 0.024, secondaryMin: 15, secondaryMax: 25 },
    risks: ["Correlacion aumenta bajo estres", "Liquidez sobreestimada"], opportunities: ["Cobertura por duration", "Reserva de liquidez escalonada"], safetyNote: "Demostracion educativa con datos sinteticos. No constituye asesoramiento financiero, aprobacion de inversion ni precio ejecutable."
  },
  {
    slug: "government", domain: "Government", name: "Public Value Ledger", title: "Presupuesto, programas e impacto institucional", summary: "Conecta asignaciones, programas, indicadores y evidencia con definiciones y trazabilidad publica.", visualGroup: "pipeline", visualMode: "public-programs", accent: "#7db5ff", accentAlt: "#f5c86a", vocabulary: ["programa", "ejecucion", "cobertura", "impacto"],
    kpis: [kpi("Ejecucion presupuestaria", 67, "%", "+5 pp", "neutral", "Presupuesto sintetico"), kpi("Programas en riesgo", 8, "", "+2", "critical", "Umbrales demo"), kpi("Cobertura objetivo", 79, "%", "+3 pp", "positive", "Beneficiarios agregados"), kpi("Evidencia vigente", 72, "%", "-1 pp", "watch", "Fuentes ficticias")],
    chart: { title: "Presupuesto a resultado", summary: "Indice de conversion sintetico desde credito hasta resultado; no representa gasto publico real.", labels: ["Credito", "Compromiso", "Devengado", "Pagado", "Producto", "Resultado"], values: [100, 86, 71, 67, 58, 44], unit: "%" },
    nodes: [node("Programa Salud", "Ejec. 74%"), node("Programa Empleo", "Resultado 61%", "watch"), node("Programa Vivienda", "Demora", "critical"), node("Regulacion A", "En consulta"), node("Servicio Digital", "Cobertura 88%", "positive")],
    models: [model("Costo-beneficio", "Comparar opciones", "Beneficios no monetarios simplificados"), model("Dinamica de sistemas", "Explorar efectos", "No predice comportamiento politico"), model("Evaluacion de impacto demo", "Separar resultado y actividad", "Sin inferencia causal real")],
    sources: [source("Ejecucion presupuestaria", "Sintetico", "Mensual", "Sin sistemas gubernamentales"), source("Indicadores de programa", "Agregado", "Trimestral", "Poblacion ficticia"), source("Registro normativo", "Curado", "Semanal", "Textos de ejemplo")],
    roles: [role("Public Finance Analyst", "Presupuesto y ejecucion", "Mapa de desvio"), role("Policy Impact Reviewer", "Resultados y evidencia", "Opciones de politica"), role("Institutional Governance Steward", "Autoridad y auditoria", "Registro de decision")],
    scenario: { name: "Reasignacion programatica", assumption: "La capacidad de implementacion no cambia durante el periodo.", inputLabel: "Presupuesto reasignado", inputUnit: "M USD", min: -30, max: 60, step: 5, baseline: 0, primaryLabel: "Cobertura objetivo", primaryUnit: "%", primaryBase: 79, primarySensitivity: 0.19, primaryMin: 72, primaryMax: 89, secondaryLabel: "Riesgo de ejecucion", secondaryUnit: "%", secondaryBase: 28, secondarySensitivity: 0.12, secondaryMin: 24, secondaryMax: 36 },
    risks: ["Ejecucion sin evidencia de resultado", "Capacidad institucional saturada"], opportunities: ["Reasignar por brecha territorial", "Publicar definiciones junto al KPI"]
  },
  {
    slug: "healthcare", domain: "Healthcare", name: "Health Capacity Command", title: "Capacidad hospitalaria, flujo y calidad agregada", summary: "Prioriza cuellos de botella del sistema con datos sinteticos agregados, sin historias clinicas ni decisiones automatizadas.", visualGroup: "map", visualMode: "care-capacity", accent: "#69d6cb", accentAlt: "#6e9cff", vocabulary: ["ocupacion", "LOS", "throughput", "derivacion"],
    kpis: [kpi("Ocupacion", 86, "%", "+4 pp", "critical", "Hospitales ficticios"), kpi("Espera mediana", 42, "min", "-6 min", "positive", "Flujo simulado"), kpi("Altas previstas", 37, "", "+5", "neutral", "Prediccion demo"), kpi("Calidad operativa", 92, "%", "+1 pp", "positive", "Indice agregado")],
    chart: { title: "Demanda y capacidad", summary: "Demanda sintetica por bloque; no es informacion clinica ni orientacion de tratamiento.", labels: ["00h", "04h", "08h", "12h", "16h", "20h"], values: [42, 38, 67, 91, 84, 63], unit: "% capacidad" },
    nodes: [node("Hospital Norte", "Ocup. 93%", "critical"), node("Hospital Centro", "Ocup. 81%", "watch"), node("Urgencias", "Espera 42 min"), node("Diagnostico", "Backlog 18", "watch"), node("Altas", "37 previstas", "positive")],
    models: [model("Queueing hospitalario", "Explorar espera", "No decide tratamientos"), model("Forecast de demanda", "Anticipar picos", "Datos sinteticos"), model("Escenario de capacidad", "Comparar recursos", "No asigna pacientes")],
    sources: [source("Capacidad hospitalaria", "Agregado sintetico", "T-15 min", "Sin datos de pacientes"), source("Demanda de servicios", "Simulado", "T-1 h", "Sin diagnosticos"), source("Indicadores de calidad", "Agregado", "Mensual", "No apto para evaluacion clinica")],
    roles: [role("Patient Flow Analyst", "Capacidad y espera", "Cola agregada"), role("Population Capacity Reviewer", "Demanda y acceso", "Escenario territorial"), role("Clinical Governance Steward", "Limites y autoridad", "Registro de revision")],
    scenario: { name: "Pico de demanda", assumption: "La complejidad de casos y la dotacion permanecen constantes.", inputLabel: "Llegadas por hora", inputUnit: "", min: 18, max: 58, step: 2, baseline: 34, primaryLabel: "Espera mediana", primaryUnit: "min", primaryBase: 42, primarySensitivity: 1.35, primaryMin: 20, primaryMax: 74, secondaryLabel: "Ocupacion", secondaryUnit: "%", secondaryBase: 86, secondarySensitivity: 0.62, secondaryMin: 74, secondaryMax: 97 },
    risks: ["Saturacion de urgencias", "Cuello de botella diagnostico"], opportunities: ["Coordinar altas anticipadas", "Derivacion agregada entre centros"], safetyNote: "Solo datos sinteticos y agregados. No contiene informacion medica personal y no recomienda, prioriza ni decide tratamientos."
  },
  {
    slug: "infrastructure", domain: "Infrastructure", name: "Asset Resilience Twin", title: "Condicion, mantenimiento y dependencias criticas", summary: "Navega desde portafolio a activos abstractos para priorizar mantenimiento y resiliencia.", visualGroup: "map", visualMode: "asset-twin", accent: "#ffb86b", accentAlt: "#68b8d8", vocabulary: ["condition", "backlog", "criticality", "lifecycle"],
    kpis: [kpi("Salud de activos", 72, "%", "-2 pp", "watch", "Portafolio sintetico"), kpi("Backlog", 38, "M USD", "+4M", "critical", "Ordenes ficticias"), kpi("Disponibilidad", 94, "%", "+1 pp", "positive", "Estado simulado"), kpi("Dependencias altas", 7, "", "+1", "critical", "Grafo abstracto")],
    chart: { title: "Deterioro y mantenimiento", summary: "Indice sintetico de condicion; no contiene telemetria ni ubicaciones de infraestructura real.", labels: ["T-5", "T-4", "T-3", "T-2", "T-1", "Ahora"], values: [82, 80, 78, 76, 73, 72], unit: "% salud" },
    nodes: [node("Bridge A", "Condicion 68%", "watch"), node("Plant B", "Criticidad alta", "critical"), node("Corridor C", "Disp. 96%", "positive"), node("Depot D", "WO vencida"), node("Dependency E", "Single point", "critical")],
    models: [model("Deterioro de activos", "Estimar condicion", "Curvas ficticias"), model("Optimizacion de mantenimiento", "Comparar secuencias", "No emite ordenes de trabajo"), model("Grafo de dependencias", "Medir criticidad", "Topologia abstracta")],
    sources: [source("Registro de activos", "Sintetico", "Diario", "Sin ubicaciones reales"), source("Ordenes de mantenimiento", "Simulado", "T-6 h", "Sin sistemas operativos"), source("Inspecciones", "Estimado", "Mensual", "Hallazgos ficticios")],
    roles: [role("Asset Condition Analyst", "Salud y deterioro", "Ranking de activos"), role("Maintenance Portfolio Reviewer", "Backlog y costo", "Secuencia de intervencion"), role("Resilience Dependency Steward", "Criticidad y cascadas", "Mapa de dependencias")],
    scenario: { name: "Presupuesto de mantenimiento", assumption: "Las tasas de deterioro permanecen estables.", inputLabel: "Inversion anual", inputUnit: "M USD", min: 20, max: 95, step: 5, baseline: 50, primaryLabel: "Salud de activos", primaryUnit: "%", primaryBase: 72, primarySensitivity: 0.31, primaryMin: 62, primaryMax: 86, secondaryLabel: "Backlog", secondaryUnit: "M USD", secondaryBase: 38, secondarySensitivity: -0.46, secondaryMin: 17, secondaryMax: 52 },
    risks: ["Single point of failure", "Backlog crece mas rapido que el presupuesto"], opportunities: ["Mantenimiento por criticidad", "Agrupar intervenciones por corredor"], safetyNote: "Topologia, ubicaciones y telemetria son abstractas. La interfaz no controla activos ni emite ordenes de trabajo."
  },
  {
    slug: "international-relations", domain: "International Relations", name: "Global Relations Atlas", title: "Comercio, alianzas, tensiones y dependencias", summary: "Compara relaciones entre paises mediante flujos agregados, evidencia fechada y escenarios no predictivos.", visualGroup: "network", visualMode: "global-relations", accent: "#83a9ff", accentAlt: "#e8a96c", vocabulary: ["alignment", "exposure", "sanction", "treaty"],
    kpis: [kpi("Dependencia comercial", 37, "%", "+2 pp", "watch", "Flujos ficticios"), kpi("Relaciones estables", 64, "%", "-3 pp", "watch", "Indice demo"), kpi("Tratados activos", 28, "", "+1", "neutral", "Corpus sintetico"), kpi("Escenarios severos", 4, "", "+1", "critical", "No predictivo")],
    chart: { title: "Evolucion de tensiones", summary: "Indice sintetico derivado de eventos ficticios; no es inteligencia operacional.", labels: ["T-5", "T-4", "T-3", "T-2", "T-1", "Ahora"], values: [31, 35, 42, 39, 51, 58], unit: "indice" },
    nodes: [node("Pais A", "Socio principal"), node("Pais B", "Tension media", "watch"), node("Bloque C", "Tratado activo", "positive"), node("Ruta comercial", "Exposicion 37%", "critical"), node("Sector energia", "Dependencia alta", "watch")],
    models: [model("Grafo de relaciones", "Mapear alianzas", "No infiere intenciones"), model("Escenario geopolitico", "Explorar shocks", "No es pronostico"), model("Stress test comercial", "Medir dependencias", "Flujos sinteticos")],
    sources: [source("Comercio bilateral", "Sintetico agregado", "Mensual", "Sin datos aduaneros reales"), source("Tratados y sanciones", "Curado ficticio", "Semanal", "No asesoramiento legal"), source("Senales politicas", "Estimado", "Diario", "Evidencia de ejemplo")],
    roles: [role("Geoeconomics Analyst", "Comercio y dependencias", "Mapa de exposicion"), role("Diplomatic Scenario Reviewer", "Alianzas y tensiones", "Escenarios comparados"), role("Evidence Provenance Steward", "Fuentes y fechas", "Registro de evidencia")],
    scenario: { name: "Shock comercial", assumption: "No hay sustitucion de proveedores durante el primer periodo.", inputLabel: "Caida del flujo", inputUnit: "%", min: 0, max: 65, step: 5, baseline: 15, primaryLabel: "Exposicion economica", primaryUnit: "%", primaryBase: 37, primarySensitivity: 0.42, primaryMin: 30, primaryMax: 58, secondaryLabel: "Tiempo de recuperacion", secondaryUnit: "meses", secondaryBase: 11, secondarySensitivity: 0.16, secondaryMin: 8, secondaryMax: 19 },
    risks: ["Proveedor dominante", "Escalada de sanciones en escenario"], opportunities: ["Diversificar rutas comerciales", "Acuerdos de contingencia"]
  },
  {
    slug: "law", domain: "Law", name: "Regulatory Change Desk", title: "Obligaciones, jurisprudencia y cambios normativos", summary: "Organiza materias, plazos, obligaciones y evidencia con revision humana y sin brindar asesoramiento legal.", visualGroup: "pipeline", visualMode: "regulatory-timeline", accent: "#d2b48c", accentAlt: "#7ea7d8", vocabulary: ["matter", "obligacion", "vigencia", "precedente"],
    kpis: [kpi("Cambios abiertos", 21, "", "+4", "watch", "Corpus ficticio"), kpi("Obligaciones criticas", 6, "", "2 vencen", "critical", "Calendario demo"), kpi("Cobertura de controles", 81, "%", "+3 pp", "positive", "Evidencia sintetica"), kpi("Materias en revision", 13, "", "estable", "neutral", "Registros ficticios")],
    chart: { title: "Timeline regulatorio", summary: "Hitos y cargas sinteticas; no sustituye investigacion ni criterio profesional.", labels: ["Borrador", "Consulta", "Aprobacion", "Vigencia", "Control", "Revision"], values: [18, 32, 48, 74, 61, 39], unit: "carga" },
    nodes: [node("Matter A", "Vence 12d", "critical"), node("Regla B", "En consulta"), node("Control C", "Cobertura 91%", "positive"), node("Precedente D", "Relevancia media", "watch"), node("Obligacion E", "Owner asignado")],
    models: [model("Mapa obligacion-control", "Detectar brechas", "No determina cumplimiento legal"), model("Grafo de precedentes", "Organizar relaciones", "Relevancia sintactica ficticia"), model("Escenario regulatorio", "Explorar impactos", "No predice decisiones regulatorias")],
    sources: [source("Corpus normativo", "Ficticio", "Diario", "No es fuente oficial"), source("Registro de materias", "Sintetico", "T-6 h", "Sin clientes reales"), source("Evidencia de controles", "Simulado", "Semanal", "No certifica cumplimiento")],
    roles: [role("Regulatory Change Analyst", "Cambios y vigencia", "Timeline de obligaciones"), role("Legal Operations Reviewer", "Materias y plazos", "Cola de trabajo"), role("Compliance Evidence Steward", "Controles y trazabilidad", "Mapa de cobertura")],
    scenario: { name: "Carga regulatoria", assumption: "La capacidad del equipo permanece constante.", inputLabel: "Cambios por trimestre", inputUnit: "", min: 8, max: 42, step: 2, baseline: 21, primaryLabel: "Obligaciones criticas", primaryUnit: "", primaryBase: 6, primarySensitivity: 0.28, primaryMin: 3, primaryMax: 12, secondaryLabel: "Cobertura de controles", secondaryUnit: "%", secondaryBase: 81, secondarySensitivity: -0.38, secondaryMin: 71, secondaryMax: 86 },
    risks: ["Obligacion sin owner", "Cambio de vigencia corto"], opportunities: ["Mapeo reusable de controles", "Revision anticipada por impacto"], safetyNote: "Demostracion informativa con corpus sintetico. No constituye asesoramiento legal ni certifica cumplimiento."
  },
  {
    slug: "logistics", domain: "Logistics", name: "Supply Chain Control Tower", title: "Rutas, inventario y excepciones multimodales", summary: "Sincroniza un mapa de rutas con hitos, ETA, capacidad y colas de excepcion usando envios ficticios.", visualGroup: "flow", visualMode: "control-tower", accent: "#55d8ff", accentAlt: "#ffb75f", vocabulary: ["ETA", "dwell", "lane", "fill rate"],
    kpis: [kpi("On-time", 88, "%", "+3 pp", "positive", "Envios sinteticos"), kpi("Excepciones", 23, "", "+5", "critical", "Cola ficticia"), kpi("Dwell medio", 7.2, "h", "-0.8 h", "positive", "Nodos simulados", 1), kpi("Inventario en riesgo", 14, "%", "+2 pp", "watch", "Demanda demo")],
    chart: { title: "Flujo por corredor", summary: "Indice de volumen y demora en seis corredores ficticios.", labels: ["A-N", "A-S", "B-E", "B-O", "C-M", "D-P"], values: [72, 54, 91, 63, 47, 81], unit: "indice" },
    nodes: [node("Port Alpha", "Dwell 9.4 h", "watch"), node("DC Norte", "Fill 92%", "positive"), node("Lane B-E", "ETA +6 h", "critical"), node("Carrier 03", "On-time 86%"), node("Stock SKU-X", "Cobertura 8d", "watch")],
    models: [model("ETA probabilistico", "Estimar demora", "No usa posiciones reales"), model("Optimizacion de inventario", "Explorar buffers", "Costos ficticios"), model("Stress test de red", "Simular cierres", "Red abstracta")],
    sources: [source("Hitos de envio", "Sintetico", "T-15 min", "Sin clientes ni carga real"), source("Inventario por nodo", "Simulado", "T-1 h", "Sin WMS"), source("Capacidad de transporte", "Estimado", "Diario", "Tarifas ficticias")],
    roles: [role("Network Flow Analyst", "Rutas y capacidad", "Mapa de cuellos"), role("Inventory Risk Reviewer", "Cobertura y stock", "Cola de reposicion"), role("Exception Governance Steward", "Owner y SLA", "Timeline auditable")],
    scenario: { name: "Cierre de corredor", assumption: "La demanda y las tarifas permanecen constantes.", inputLabel: "Capacidad disponible", inputUnit: "%", min: 30, max: 100, step: 5, baseline: 80, primaryLabel: "On-time", primaryUnit: "%", primaryBase: 88, primarySensitivity: 0.31, primaryMin: 72, primaryMax: 94, secondaryLabel: "Inventario en riesgo", secondaryUnit: "%", secondaryBase: 14, secondarySensitivity: -0.28, secondaryMin: 8, secondaryMax: 28 },
    risks: ["Corredor con baja redundancia", "Inventario concentrado"], opportunities: ["Rebalancear buffers", "Enrutamiento alternativo temprano"]
  },
  {
    slug: "manufacturing", domain: "Manufacturing", name: "Factory Performance Cell", title: "Planta, lineas, calidad y mantenimiento", summary: "Desglosa OEE y excepciones desde planta a activo sin conectarse a controles ni maquinaria.", visualGroup: "flow", visualMode: "factory-flow", accent: "#f5b75d", accentAlt: "#5fc9e8", vocabulary: ["OEE", "scrap", "MTBF", "changeover"],
    kpis: [kpi("OEE", 76, "%", "+2 pp", "positive", "Lineas sinteticas"), kpi("Scrap", 3.8, "%", "+0.6 pp", "critical", "Calidad simulada", 1), kpi("MTBF", 41, "h", "+5 h", "positive", "Activos ficticios"), kpi("Ordenes atrasadas", 12, "", "+3", "watch", "Plan demo")],
    chart: { title: "Produccion por turno", summary: "Indice sintetico de output y paradas; no es telemetria industrial.", labels: ["L1-A", "L1-B", "L2-A", "L2-B", "L3-A", "L3-B"], values: [82, 77, 91, 66, 73, 58], unit: "% plan" },
    nodes: [node("Linea 1", "OEE 82%", "positive"), node("Linea 2", "Scrap 5.1%", "critical"), node("Activo P-4", "MTBF bajo", "watch"), node("Proveedor Q", "Demora 2d"), node("Calidad", "3 alertas", "critical")],
    models: [model("Descomposicion OEE", "Separar perdidas", "Datos sinteticos"), model("Mantenimiento predictivo demo", "Priorizar inspecciones", "No controla equipos"), model("Simulacion de linea", "Explorar capacidad", "Layout simplificado")],
    sources: [source("Produccion por turno", "Sintetico", "T-15 min", "Sin MES"), source("Eventos de activo", "Simulado", "T-5 min", "Sin PLC ni endpoints"), source("Calidad de lote", "Agregado", "T-1 h", "Sin trazabilidad real")],
    roles: [role("Operations Performance Analyst", "OEE y capacidad", "Pareto de perdidas"), role("Reliability Reviewer", "Fallas y mantenimiento", "Cola de activos"), role("Quality Systems Steward", "Defectos y evidencia", "Mapa de causas")],
    scenario: { name: "Velocidad de linea", assumption: "La mezcla de producto y el plan de mantenimiento permanecen constantes.", inputLabel: "Velocidad vs. nominal", inputUnit: "%", min: 65, max: 115, step: 5, baseline: 90, primaryLabel: "OEE", primaryUnit: "%", primaryBase: 76, primarySensitivity: 0.36, primaryMin: 66, primaryMax: 84, secondaryLabel: "Scrap", secondaryUnit: "%", secondaryBase: 3.8, secondarySensitivity: 0.095, secondaryMin: 1.6, secondaryMax: 6.2 },
    risks: ["Scrap aumenta con velocidad", "Activo critico con MTBF bajo"], opportunities: ["Changeover estandarizado", "Mantenimiento en ventana de baja carga"], safetyNote: "Analitica read-only. No ejecuta comandos, no cambia setpoints y no se conecta a maquinaria o redes OT."
  },
  {
    slug: "mining", domain: "Mining", name: "Mine Value & Resilience", title: "Produccion, reservas, agua y seguridad operacional agregada", summary: "Compara plan y resultado sobre un sitio completamente ficticio, sin rutas ni telemetria reales.", visualGroup: "map", visualMode: "mine-operations", accent: "#d7a76a", accentAlt: "#6eb8bf", vocabulary: ["ore", "strip ratio", "payload", "recovery"],
    kpis: [kpi("Produccion", 118, "kt", "+4 kt", "positive", "Turno sintetico"), kpi("Recovery", 86, "%", "-1 pp", "watch", "Proceso simulado"), kpi("Agua recirculada", 71, "%", "+5 pp", "positive", "Balance ficticio"), kpi("Activos con alerta", 5, "", "+2", "critical", "Sin telemetria real")],
    chart: { title: "Plan vs. produccion", summary: "Indice por frente ficticio; no representa un yacimiento ni una operacion real.", labels: ["F-A", "F-B", "F-C", "P-1", "P-2", "Stock"], values: [96, 83, 71, 88, 92, 64], unit: "% plan" },
    nodes: [node("Pit Alpha", "Plan 96%", "positive"), node("Haul 2", "Cola alta", "watch"), node("Plant 1", "Recovery 86%"), node("Water loop", "Recirc. 71%", "positive"), node("Asset H-7", "Alerta", "critical")],
    models: [model("Simulacion de acarreo", "Explorar ciclos", "Rutas y equipos ficticios"), model("Balance de proceso", "Comparar recovery", "Mineralogia simplificada"), model("Real options minero", "Valorar secuencias", "No es valuacion de inversion")],
    sources: [source("Plan de turno", "Sintetico", "T-1 h", "Sin sitio real"), source("Estado de activos", "Simulado", "T-15 min", "Sin telemetria"), source("Balance de agua", "Estimado", "Diario", "Valores ficticios")],
    roles: [role("Mine Planning Analyst", "Plan y secuencia", "Desvio por frente"), role("Process Performance Reviewer", "Recovery y capacidad", "Balance de planta"), role("Water & Safety Steward", "Recursos y limites", "Registro de riesgo")],
    scenario: { name: "Capacidad de acarreo", assumption: "La geologia y el plan de mina permanecen constantes.", inputLabel: "Capacidad relativa", inputUnit: "%", min: 55, max: 115, step: 5, baseline: 90, primaryLabel: "Produccion", primaryUnit: "kt", primaryBase: 118, primarySensitivity: 1.1, primaryMin: 80, primaryMax: 145, secondaryLabel: "Cola media", secondaryUnit: "min", secondaryBase: 12, secondarySensitivity: -0.31, secondaryMin: 4, secondaryMax: 24 },
    risks: ["Cola de acarreo concentrada", "Balance hidrico estrecho"], opportunities: ["Secuencia alternativa de frentes", "Recirculacion incremental"], safetyNote: "Sitio, rutas, reservas y activos son ficticios. La interfaz no despacha equipos ni controla una operacion minera."
  },
  {
    slug: "public-safety", domain: "Public Safety", name: "Community Safety Overview", title: "Incidentes agregados, respuesta y prevencion", summary: "Presenta patrones territoriales y capacidad institucional sin reconocimiento facial, perfilado ni seguimiento individual.", visualGroup: "map", visualMode: "community-safety", accent: "#78b8ff", accentAlt: "#ff9b72", vocabulary: ["incidente", "cobertura", "respuesta", "prevencion"],
    kpis: [kpi("Incidentes agregados", 146, "", "-8%", "positive", "Datos ficticios"), kpi("Respuesta p50", 8.6, "min", "-0.7", "positive", "Tiempos simulados", 1), kpi("Zonas con alerta", 4, "", "+1", "watch", "Grilla abstracta"), kpi("Cobertura preventiva", 69, "%", "+4 pp", "neutral", "Programas demo")],
    chart: { title: "Patron temporal agregado", summary: "Conteos sinteticos por ventana; no identifica personas, domicilios ni dispositivos.", labels: ["00h", "04h", "08h", "12h", "16h", "20h"], values: [28, 19, 37, 54, 73, 61], unit: "indice" },
    nodes: [node("Zona Norte", "Tendencia -6%", "positive"), node("Zona Centro", "Alerta media", "watch"), node("Zona Este", "Respuesta 11m", "critical"), node("Programa A", "Cobertura 74%"), node("Coordinacion", "3 agencias")],
    models: [model("Analisis temporal agregado", "Identificar ventanas", "No predice conducta individual"), model("Queueing de respuesta", "Explorar capacidad", "No despacha unidades"), model("Escenario preventivo", "Comparar programas", "Efectos no causales")],
    sources: [source("Incidentes agregados", "Sintetico", "T-24 h", "Sin PII ni direcciones"), source("Capacidad institucional", "Simulado", "T-1 h", "Sin ubicacion de personal"), source("Programas preventivos", "Estimado", "Mensual", "Poblacion ficticia")],
    roles: [role("Aggregate Pattern Analyst", "Tiempo y territorio", "Mapa de patrones"), role("Response Capacity Reviewer", "Tiempos y cobertura", "Escenario de capacidad"), role("Community Safeguards Steward", "Privacidad y limites", "Registro de uso")],
    scenario: { name: "Cobertura preventiva", assumption: "La demanda base y la dotacion permanecen constantes.", inputLabel: "Cobertura de programa", inputUnit: "%", min: 25, max: 95, step: 5, baseline: 65, primaryLabel: "Incidentes indice", primaryUnit: "", primaryBase: 100, primarySensitivity: -0.38, primaryMin: 86, primaryMax: 116, secondaryLabel: "Respuesta p50", secondaryUnit: "min", secondaryBase: 8.6, secondarySensitivity: -0.035, secondaryMin: 7.4, secondaryMax: 10.2 },
    risks: ["Cobertura desigual", "Interpretacion causal indebida"], opportunities: ["Prevencion por brecha territorial", "Coordinacion interinstitucional"], safetyNote: "Solo estadisticas agregadas y demoradas. No incluye reconocimiento facial, seguimiento, perfilado de personas ni herramientas de vigilancia."
  },
  {
    slug: "science", domain: "Science", name: "Evidence Discovery Graph", title: "Hipotesis, experimentos y replicabilidad", summary: "Conecta publicaciones, evidencia y experimentos con procedencia, incertidumbre y brechas de replicacion.", visualGroup: "network", visualMode: "evidence-network", accent: "#9c8cff", accentAlt: "#55d6c2", vocabulary: ["hipotesis", "replicacion", "evidencia", "prior"],
    kpis: [kpi("Hipotesis activas", 18, "", "+3", "neutral", "Portafolio sintetico"), kpi("Evidencia replicada", 56, "%", "+5 pp", "positive", "Corpus ficticio"), kpi("Experimentos abiertos", 11, "", "4 bloqueados", "watch", "Laboratorio demo"), kpi("Cobertura de datos", 73, "%", "-2 pp", "watch", "Datasets sinteticos")],
    chart: { title: "Madurez de evidencia", summary: "Indice sintetico por etapa; no evalua investigadores ni instituciones reales.", labels: ["Idea", "Diseño", "Piloto", "Replicacion", "Sintesis", "Transferencia"], values: [91, 74, 62, 56, 41, 27], unit: "%" },
    nodes: [node("Hipotesis H-12", "Prior 0.42"), node("Experimento E-7", "En curso"), node("Dataset D-3", "Cobertura 73%", "watch"), node("Replica R-2", "Consistente", "positive"), node("Gap G-5", "Critico", "critical")],
    models: [model("Actualizacion bayesiana", "Revisar evidencia", "Priors demostrativos"), model("Grafo de conocimiento", "Mapear relaciones", "Cobertura parcial"), model("Analisis de replicabilidad", "Priorizar replicas", "No determina verdad cientifica")],
    sources: [source("Corpus de publicaciones", "Sintetico", "Semanal", "No bibliometria real"), source("Registro experimental", "Simulado", "T-24 h", "Sin datos de laboratorio"), source("Datasets", "Ficticio", "Mensual", "Calidad demostrativa")],
    roles: [role("Evidence Synthesis Analyst", "Corpus y claims", "Mapa de evidencia"), role("Experimental Design Reviewer", "Metodos y potencia", "Plan de validacion"), role("Reproducibility Steward", "Replicas y procedencia", "Registro de limites")],
    scenario: { name: "Inversion en replicacion", assumption: "La tasa de resultados consistentes se mantiene.", inputLabel: "Experimentos replicados", inputUnit: "", min: 2, max: 24, step: 2, baseline: 10, primaryLabel: "Evidencia replicada", primaryUnit: "%", primaryBase: 56, primarySensitivity: 1.35, primaryMin: 45, primaryMax: 75, secondaryLabel: "Incertidumbre", secondaryUnit: "indice", secondaryBase: 44, secondarySensitivity: -1.1, secondaryMin: 28, secondaryMax: 53 },
    risks: ["Cobertura sesgada del corpus", "Replicas con bajo poder"], opportunities: ["Priorizar claims centrales", "Compartir protocolos reproducibles"]
  },
  {
    slug: "space", domain: "Space", name: "Orbital Mission Desk", title: "Misiones, orbitas, cobertura y riesgo", summary: "Controla el tiempo de una simulacion orbital y revisa conjunciones ficticias sin tasking ni efemerides sensibles.", visualGroup: "network", visualMode: "orbital-map", accent: "#8fa8ff", accentAlt: "#6de4de", vocabulary: ["revisit", "conjunction", "link budget", "ephemeris"],
    kpis: [kpi("Satelites simulados", 24, "", "+2", "neutral", "Constelacion ficticia"), kpi("Cobertura", 83, "%", "+4 pp", "positive", "Modelo demo"), kpi("Conjunciones", 6, "", "1 alta", "critical", "Eventos sinteticos"), kpi("Revisit time", 42, "min", "-6 min", "positive", "Orbita abstracta")],
    chart: { title: "Ventanas de cobertura", summary: "Cobertura sintetica por orbita; no expone efemerides ni tasking reales.", labels: ["O-1", "O-2", "O-3", "O-4", "O-5", "O-6"], values: [71, 84, 79, 92, 67, 88], unit: "%" },
    nodes: [node("Sat A-1", "Nominal", "positive"), node("Sat A-2", "Link bajo", "watch"), node("Ground 1", "Ventana 12m"), node("Conjunction C", "Alta", "critical"), node("Mission B", "TRL 7")],
    models: [model("Propagacion orbital demo", "Explorar cobertura", "Orbitas ficticias"), model("Riesgo de conjuncion", "Priorizar revision", "No produce maniobras"), model("Real options de mision", "Comparar fases", "Costos sinteticos")],
    sources: [source("Estado de constelacion", "Sintetico", "T-5 min", "Sin efemerides reales"), source("Eventos de conjuncion", "Simulado", "T-15 min", "Sin objetos reales"), source("Mercado espacial", "Estimado", "Trimestral", "Senales ficticias")],
    roles: [role("Mission Architecture Analyst", "Capacidad y cobertura", "Comparador de mision"), role("Orbital Risk Reviewer", "Conjunciones y disponibilidad", "Cola de eventos"), role("Space Portfolio Steward", "Fases y opciones", "Roadmap de portafolio")],
    scenario: { name: "Tamano de constelacion", assumption: "Orbita, disponibilidad y demanda permanecen constantes.", inputLabel: "Satelites", inputUnit: "", min: 8, max: 48, step: 4, baseline: 24, primaryLabel: "Cobertura", primaryUnit: "%", primaryBase: 83, primarySensitivity: 0.72, primaryMin: 68, primaryMax: 96, secondaryLabel: "Costo anual", secondaryUnit: "M USD", secondaryBase: 118, secondarySensitivity: 4.6, secondaryMin: 42, secondaryMax: 228 },
    risks: ["Conjuncion de alta prioridad simulada", "Dependencia de estacion terrestre"], opportunities: ["Optimizar planos orbitales", "Servicio compartido de ground segment"], safetyNote: "Todos los objetos, orbitas y eventos son ficticios. No muestra tasking, payloads ni efemerides reales y no genera comandos de mision."
  },
  {
    slug: "sports", domain: "Sports", name: "Performance & Match Lab", title: "Carga, rendimiento, estrategia y audiencia", summary: "Integra ciclos de entrenamiento, tactica y negocio con atletas y partidos completamente sinteticos.", visualGroup: "matrix", visualMode: "performance-grid", accent: "#78e08f", accentAlt: "#5da7ff", vocabulary: ["microciclo", "load", "xG", "availability"],
    kpis: [kpi("Disponibilidad", 91, "%", "+3 pp", "positive", "Plantel ficticio"), kpi("Carga aguda", 82, "indice", "+7", "watch", "Sesiones sinteticas"), kpi("xG diferencial", 0.64, "", "+0.18", "positive", "Partidos simulados", 2), kpi("Ingreso por fan", 18.4, "USD", "+5%", "neutral", "Audiencia ficticia", 1)],
    chart: { title: "Carga del microciclo", summary: "Indice sintetico por dia; no contiene datos biologicos ni de atletas reales.", labels: ["MD-5", "MD-4", "MD-3", "MD-2", "MD-1", "MD"], values: [54, 71, 88, 76, 42, 63], unit: "indice" },
    nodes: [node("Squad", "Avail. 91%", "positive"), node("Unit A", "Carga alta", "watch"), node("Opponent", "Press 64%"), node("Academy", "3 prospects"), node("Audience", "Engagement +8%", "positive")],
    models: [model("Planificacion de carga", "Comparar microciclos", "No da indicaciones medicas"), model("Simulacion tactica", "Explorar estrategias", "Partidos ficticios"), model("Forecast de audiencia", "Estimar demanda", "No predice ingresos garantizados")],
    sources: [source("Sesiones de entrenamiento", "Sintetico agregado", "T-2 h", "Sin biometria real"), source("Eventos de partido", "Simulado", "T-15 min", "Sin jugadores reales"), source("Audiencia e ingresos", "Estimado", "Semanal", "Cuentas ficticias")],
    roles: [role("Performance Load Analyst", "Carga y disponibilidad", "Plan de microciclo"), role("Tactical Scenario Reviewer", "Juego y rival", "Comparador tactico"), role("Sports Business Steward", "Audiencia e ingresos", "Escenario comercial")],
    scenario: { name: "Carga de entrenamiento", assumption: "La disponibilidad y el calendario de partidos se mantienen.", inputLabel: "Carga semanal", inputUnit: "indice", min: 45, max: 110, step: 5, baseline: 80, primaryLabel: "Readiness", primaryUnit: "%", primaryBase: 88, primarySensitivity: -0.19, primaryMin: 81, primaryMax: 95, secondaryLabel: "Rendimiento esperado", secondaryUnit: "indice", secondaryBase: 72, secondarySensitivity: 0.12, secondaryMin: 68, secondaryMax: 76 },
    risks: ["Carga concentrada en una unidad", "Calendario con baja recuperacion"], opportunities: ["Individualizar por rol sin perfilar salud", "Alinear tactica y carga"]
  },
  {
    slug: "telecommunications", domain: "Telecommunications", name: "Network Experience Grid", title: "Cobertura, capacidad y calidad de red", summary: "Navega region a celda abstracta con excepciones y frescura, sin datos de abonados ni topologia exacta.", visualGroup: "map", visualMode: "coverage-heatmap", accent: "#68d5ff", accentAlt: "#9a8cff", vocabulary: ["RAN", "latency", "handover", "throughput"],
    kpis: [kpi("Disponibilidad", 99.93, "%", "+0.02", "positive", "Red sintetica", 2), kpi("Latencia p95", 31, "ms", "+4 ms", "watch", "Trafico simulado"), kpi("Celdas saturadas", 18, "", "+3", "critical", "Topologia abstracta"), kpi("Handover success", 97.4, "%", "-0.3", "watch", "Metrica ficticia", 1)],
    chart: { title: "Demanda por region", summary: "Indice sintetico de trafico; no contiene ubicacion ni actividad de abonados.", labels: ["Norte", "Centro", "Este", "Oeste", "Sur", "Rural"], values: [68, 93, 81, 72, 64, 47], unit: "indice" },
    nodes: [node("Region Centro", "Util. 93%", "critical"), node("Cluster East", "Latency 38ms", "watch"), node("Rural ring", "Coverage 87%"), node("Core slice", "Nominal", "positive"), node("Tower group", "3 alerts", "critical")],
    models: [model("Forecast de trafico", "Anticipar capacidad", "Demanda ficticia"), model("Optimizacion de cobertura", "Comparar inversiones", "Sin ubicaciones reales"), model("Analisis de anomalias", "Priorizar revision", "No ejecuta cambios de red")],
    sources: [source("KPIs de red", "Sintetico agregado", "T-5 min", "Sin abonados"), source("Inventario de celdas", "Abstracto", "T-1 h", "Sin topologia exacta"), source("Plan de inversion", "Simulado", "Mensual", "Costos ficticios")],
    roles: [role("RAN Performance Analyst", "Cobertura y trafico", "Heatmap de excepciones"), role("Capacity Investment Reviewer", "Demanda y CAPEX", "Roadmap de expansion"), role("Network Privacy Steward", "Agregacion y limites", "Registro de uso")],
    scenario: { name: "Crecimiento de trafico", assumption: "La topologia y el espectro permanecen constantes.", inputLabel: "Trafico vs. base", inputUnit: "%", min: 70, max: 180, step: 10, baseline: 100, primaryLabel: "Celdas saturadas", primaryUnit: "", primaryBase: 18, primarySensitivity: 0.22, primaryMin: 10, primaryMax: 36, secondaryLabel: "Latencia p95", secondaryUnit: "ms", secondaryBase: 31, secondarySensitivity: 0.15, secondaryMin: 25, secondaryMax: 43 },
    risks: ["Saturacion en cluster central", "Cobertura rural desigual"], opportunities: ["Small cells por hotspot", "Priorizacion CAPEX por experiencia"], safetyNote: "No contiene datos de abonados, IMSI, ubicaciones ni topologia exacta. No ejecuta cambios en la red."
  },
  {
    slug: "universities", domain: "Universities", name: "Research & Talent Portfolio", title: "Programas, laboratorios y transferencia tecnologica", summary: "Une investigacion, talento, patentes y alianzas en una cartera institucional con vistas por rol.", visualGroup: "network", visualMode: "research-portfolio", accent: "#9b8cff", accentAlt: "#f0c465", vocabulary: ["grant", "lab", "spinout", "transferencia"],
    kpis: [kpi("Proyectos activos", 126, "", "+8", "neutral", "Universidad ficticia"), kpi("Fondos competitivos", 42, "M USD", "+6%", "positive", "Grants sinteticos"), kpi("Labs con brecha", 9, "", "+2", "critical", "Capacidad demo"), kpi("Transferencias", 17, "", "+3", "positive", "Acuerdos ficticios")],
    chart: { title: "Pipeline de transferencia", summary: "Indice sintetico desde descubrimiento a startup; no evalua investigadores reales.", labels: ["Disclosure", "Validacion", "Patente", "Licencia", "Spinout", "Escala"], values: [92, 67, 48, 31, 19, 8], unit: "%" },
    nodes: [node("Lab Quantum", "Capacidad 74%"), node("Program AI", "Demanda alta", "positive"), node("Patent cluster", "12 familias"), node("Industry partner", "3 acuerdos"), node("Talent gap", "Critical", "critical")],
    models: [model("Portfolio MCDA", "Priorizar programas", "Pesos ilustrativos"), model("Red de colaboracion", "Mapear alianzas", "No mide calidad individual"), model("Forecast de talento", "Explorar brechas", "Demanda ficticia")],
    sources: [source("Proyectos y grants", "Sintetico", "Mensual", "Sin investigadores reales"), source("Resultados de investigacion", "Agregado", "Trimestral", "Corpus ficticio"), source("Transferencia tecnologica", "Simulado", "Mensual", "Sin contratos reales")],
    roles: [role("Research Portfolio Analyst", "Proyectos y capacidad", "Mapa de cartera"), role("Technology Transfer Reviewer", "Patentes y alianzas", "Pipeline de transferencia"), role("Talent Strategy Steward", "Programas y habilidades", "Escenario de brechas")],
    scenario: { name: "Fondo semilla universitario", assumption: "La tasa de maduracion de proyectos se mantiene.", inputLabel: "Capital anual", inputUnit: "M USD", min: 1, max: 18, step: 1, baseline: 6, primaryLabel: "Proyectos validados", primaryUnit: "", primaryBase: 14, primarySensitivity: 1.05, primaryMin: 8, primaryMax: 27, secondaryLabel: "Spinouts esperadas", secondaryUnit: "", secondaryBase: 3, secondarySensitivity: 0.22, secondaryMin: 2, secondaryMax: 6 },
    risks: ["Capacidad de laboratorio desigual", "Talento critico escaso"], opportunities: ["Fondo de validacion por hitos", "Alianzas multi-laboratorio"]
  },
  {
    slug: "venture-capital", domain: "Venture Capital", name: "Venture Governance Core", title: "Scouting, due diligence y portfolio intelligence", summary: "Amplia el nucleo de Venture Governance con pipeline, escenarios, ranking y gates humanos visibles.", visualGroup: "pipeline", visualMode: "venture-funnel", accent: "#67d6ff", accentAlt: "#f2b765", vocabulary: ["dealflow", "DPI", "TVPI", "reserve"],
    kpis: [kpi("Oportunidades activas", 42, "", "+7", "neutral", "Dealflow sintetico"), kpi("Conversion a DD", 18, "%", "+2 pp", "positive", "Pipeline ficticio"), kpi("Reservas desplegadas", 61, "%", "+4 pp", "watch", "Fondo demo"), kpi("Supuestos sin validar", 27, "", "-5", "positive", "Dossiers sinteticos")],
    chart: { title: "Funnel de oportunidades", summary: "Pipeline sintetico; ningun score aprueba una inversion.", labels: ["Sourced", "Screen", "Meeting", "DD", "IC", "Portfolio"], values: [100, 61, 38, 18, 9, 5], unit: "%" },
    nodes: [node("Dealflow", "42 activas"), node("Screen", "11 esta semana"), node("Due diligence", "8 abiertas", "watch"), node("Committee", "3 gates", "critical"), node("Portfolio", "17 companias", "positive")],
    models: [model("MCDA visible", "Comparar oportunidades", "Pesos demostrativos, no formula privada"), model("Monte Carlo financiero", "Explorar distribuciones", "No predice retornos"), model("Real options", "Secuenciar validacion", "No autoriza capital")],
    sources: [source("Dealflow", "Sintetico", "T-6 h", "Sin founders reales"), source("Evidencia de due diligence", "Ficticia", "Diario", "Sin documentos privados"), source("Portfolio metrics", "Simulado", "Mensual", "Sin companias reales")],
    roles: [role("Opportunity Analyst", "Scouting y mercado", "Radar priorizado"), role("Investment Evidence Reviewer", "Claims y diligencia", "Dossier de evidencia"), role("Portfolio Governance Steward", "Reservas y gates", "Registro de decision")],
    scenario: { name: "Construccion de fondo", assumption: "Las distribuciones de retorno y follow-on son ilustrativas.", inputLabel: "Reserva follow-on", inputUnit: "%", min: 20, max: 70, step: 5, baseline: 45, primaryLabel: "Cobertura de reservas", primaryUnit: "%", primaryBase: 61, primarySensitivity: 0.78, primaryMin: 40, primaryMax: 80, secondaryLabel: "Nuevas inversiones", secondaryUnit: "", secondaryBase: 8, secondarySensitivity: -0.11, secondaryMin: 5, secondaryMax: 11 },
    risks: ["Concentracion de reservas", "Evidencia comercial insuficiente"], opportunities: ["Validacion por hitos", "Escenarios de construccion de fondo"], safetyNote: "Los datos, scores y companias son sinteticos. Ningun resultado implica aprobacion, recomendacion financiera ni garantia de retorno."
  },
  {
    slug: "water", domain: "Water", name: "Watershed Resilience Room", title: "Cuencas, reservas, calidad e infraestructura", summary: "Combina balance hidrico, riesgo territorial y activos abstractos sin exponer redes ni controles operativos.", visualGroup: "map", visualMode: "watershed-map", accent: "#58c8e8", accentAlt: "#72d6a4", vocabulary: ["cuenca", "NRW", "caudal", "reserva"],
    kpis: [kpi("Reserva util", 64, "%", "-5 pp", "watch", "Cuenca sintetica"), kpi("Demanda", 3.8, "Mm3/d", "+4%", "watch", "Consumo ficticio", 1), kpi("Agua no contabilizada", 24, "%", "-2 pp", "positive", "Red abstracta"), kpi("Activos en alerta", 7, "", "+2", "critical", "Sin SCADA real")],
    chart: { title: "Balance de cuenca", summary: "Indice sintetico de aportes y demanda; no contiene topologia ni telemetria de una red real.", labels: ["Lluvia", "Reserva", "Urbano", "Agro", "Industria", "Perdidas"], values: [58, 64, 71, 83, 46, 24], unit: "indice" },
    nodes: [node("Basin North", "Reserva 64%", "watch"), node("Plant A", "Calidad nominal", "positive"), node("Zone C", "NRW 29%", "critical"), node("Agri demand", "Pico +12%", "watch"), node("Pump group", "2 alertas", "critical")],
    models: [model("Balance hidrico", "Explorar oferta-demanda", "Cuenca ficticia"), model("Escenario de sequia", "Medir resiliencia", "No es pronostico"), model("Optimizacion de perdidas", "Priorizar inspeccion", "No controla valvulas")],
    sources: [source("Niveles y caudales", "Sintetico", "T-1 h", "Sin sensores reales"), source("Demanda sectorial", "Estimado", "Diario", "Usuarios agregados"), source("Condicion de activos", "Simulado", "T-6 h", "Sin topologia SCADA")],
    roles: [role("Watershed Analyst", "Oferta y sequia", "Balance de cuenca"), role("Network Efficiency Reviewer", "Perdidas y energia", "Mapa de excepciones"), role("Water Quality Steward", "Calidad y limites", "Registro de cumplimiento demo")],
    scenario: { name: "Sequedad de cuenca", assumption: "La infraestructura y la demanda base permanecen constantes.", inputLabel: "Aporte vs. normal", inputUnit: "%", min: 35, max: 120, step: 5, baseline: 85, primaryLabel: "Reserva util", primaryUnit: "%", primaryBase: 64, primarySensitivity: 0.52, primaryMin: 38, primaryMax: 82, secondaryLabel: "Restriccion requerida", secondaryUnit: "%", secondaryBase: 8, secondarySensitivity: -0.24, secondaryMin: 0, secondaryMax: 21 },
    risks: ["Aporte bajo sostenido", "Perdidas concentradas en una zona"], opportunities: ["Reducir NRW por criticidad", "Coordinar demanda agro-urbana"], safetyNote: "La red, sensores y activos son abstractos. No muestra tags SCADA, no controla bombas o valvulas y no expone infraestructura critica."
  }
];

export function getDomainWorkspace(slug: string): DomainWorkspaceDefinition | undefined {
  return DOMAIN_WORKSPACES.find((workspace) => workspace.slug === slug);
}

function finiteClamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function simulateDomainScenario(workspace: DomainWorkspaceDefinition, rawInput: number) {
  const scenario = workspace.scenario;
  const input = finiteClamp(rawInput, scenario.min, scenario.max);
  const delta = input - scenario.baseline;
  const primary = finiteClamp(
    scenario.primaryBase + delta * scenario.primarySensitivity,
    scenario.primaryMin,
    scenario.primaryMax,
  );
  const secondary = finiteClamp(
    scenario.secondaryBase + delta * scenario.secondarySensitivity,
    scenario.secondaryMin,
    scenario.secondaryMax,
  );
  return { input, primary, secondary };
}

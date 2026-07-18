export type DomainVisualContract = {
  slug: string;
  mode: string;
  renderer: string;
  requiredFeatures: readonly [string, string, string];
};

export const DOMAIN_VISUAL_CONTRACTS: readonly DomainVisualContract[] = [
  { slug: "ai-software", mode: "ecosystem-radar", renderer: "CapabilityCostRadar", requiredFeatures: ["capability-cost matrix", "adoption curve", "ecosystem radar"] },
  { slug: "agriculture", mode: "field-map", renderer: "FieldLayerMap", requiredFeatures: ["parcel map", "climate layers", "yield estimate"] },
  { slug: "biotechnology", mode: "clinical-pipeline", renderer: "TranslationalPipeline", requiredFeatures: ["phase pipeline", "probability of success", "regulatory milestones"] },
  { slug: "blockchain", mode: "protocol-network", renderer: "ProtocolCapitalNetwork", requiredFeatures: ["protocol graph", "capital flow", "contract dependencies"] },
  { slug: "cities", mode: "urban-multilayer", renderer: "UrbanLayerTwin", requiredFeatures: ["urban grid", "service layers", "growth scenario"] },
  { slug: "climate", mode: "climate-exposure", renderer: "ClimateExposureMap", requiredFeatures: ["asset exposure", "emissions trajectory", "impact-probability"] },
  { slug: "corporate-strategy", mode: "strategy-portfolio", renderer: "StrategicPortfolioMatrix", requiredFeatures: ["competitive map", "portfolio matrix", "value pools"] },
  { slug: "culture-media", mode: "narrative-network", renderer: "NarrativeDiffusionMap", requiredFeatures: ["narrative map", "audience segments", "influence network"] },
  { slug: "cybersecurity", mode: "attack-surface", renderer: "SecurityAttackPath", requiredFeatures: ["attack graph", "incident timeline", "asset criticality"] },
  { slug: "defense", mode: "resilience-planning", renderer: "SyntheticLogisticsMap", requiredFeatures: ["synthetic geospatial map", "resource readiness", "decision trace"] },
  { slug: "education", mode: "learning-pathways", renderer: "LearningCohortPathways", requiredFeatures: ["cohort funnel", "retention path", "skills matrix"] },
  { slug: "emergency-response", mode: "incident-command", renderer: "IncidentCoordinationMap", requiredFeatures: ["incident map", "resource capacity", "response timeline"] },
  { slug: "energy", mode: "grid-flow", renderer: "EnergyFlowBalance", requiredFeatures: ["energy flow", "supply-demand", "asset status"] },
  { slug: "finance", mode: "capital-terminal", renderer: "FinancialRiskSurface", requiredFeatures: ["yield curve", "correlation heatmap", "VaR distribution"] },
  { slug: "government", mode: "public-programs", renderer: "PublicValueWaterfall", requiredFeatures: ["budget waterfall", "program hierarchy", "impact evidence"] },
  { slug: "healthcare", mode: "care-capacity", renderer: "CareCapacityBoard", requiredFeatures: ["hospital capacity", "patient-flow queue", "demand window"] },
  { slug: "infrastructure", mode: "asset-twin", renderer: "AssetConditionTwin", requiredFeatures: ["asset condition", "maintenance backlog", "critical dependencies"] },
  { slug: "international-relations", mode: "global-relations", renderer: "GeopoliticalRelationsMap", requiredFeatures: ["global relation graph", "trade flows", "risk scenario"] },
  { slug: "law", mode: "regulatory-timeline", renderer: "RegulatoryObligationTimeline", requiredFeatures: ["regulatory timeline", "obligation calendar", "control coverage"] },
  { slug: "logistics", mode: "control-tower", renderer: "LogisticsControlTower", requiredFeatures: ["route map", "shipment milestones", "bottleneck queue"] },
  { slug: "manufacturing", mode: "factory-flow", renderer: "FactoryLineControl", requiredFeatures: ["line flow", "OEE decomposition", "shift timeline"] },
  { slug: "mining", mode: "mine-operations", renderer: "MineValueFlow", requiredFeatures: ["pit-to-plant flow", "haul cycle", "water balance"] },
  { slug: "public-safety", mode: "community-safety", renderer: "AggregateSafetyHeatmap", requiredFeatures: ["aggregate heatmap", "response bands", "prevention coverage"] },
  { slug: "science", mode: "evidence-network", renderer: "ScientificEvidenceGraph", requiredFeatures: ["hypothesis graph", "experiment links", "replication status"] },
  { slug: "space", mode: "orbital-map", renderer: "OrbitalMissionMap", requiredFeatures: ["orbit map", "coverage window", "conjunction queue"] },
  { slug: "sports", mode: "performance-grid", renderer: "SportsPerformanceBoard", requiredFeatures: ["tactical field", "training load", "availability"] },
  { slug: "telecommunications", mode: "coverage-heatmap", renderer: "TelecomCoverageGrid", requiredFeatures: ["coverage heatmap", "cell capacity", "network exceptions"] },
  { slug: "universities", mode: "research-portfolio", renderer: "UniversityResearchPortfolio", requiredFeatures: ["research clusters", "talent gaps", "transfer pipeline"] },
  { slug: "venture-capital", mode: "venture-funnel", renderer: "VentureDecisionFunnel", requiredFeatures: ["deal funnel", "opportunity ranking", "Monte Carlo distribution"] },
  { slug: "water", mode: "watershed-map", renderer: "WatershedSystemMap", requiredFeatures: ["watershed map", "reservoir state", "demand allocation"] },
] as const;

export const DOMAIN_VISUAL_CONTRACT_BY_SLUG = new Map(
  DOMAIN_VISUAL_CONTRACTS.map((contract) => [contract.slug, contract]),
);

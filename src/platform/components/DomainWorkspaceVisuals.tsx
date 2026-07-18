import type { CSSProperties, ReactNode } from "react";
import type { DomainKpiTone, DomainWorkspaceDefinition } from "@/src/applications/domain-workspaces";
import styles from "./PrivateDomainWorkspaces.module.css";

type Props = { workspace: DomainWorkspaceDefinition };
type NodeItem = DomainWorkspaceDefinition["nodes"][number];

const STATUS: Record<DomainKpiTone, string> = {
  positive: "OK",
  neutral: "BASE",
  watch: "WATCH",
  critical: "PRIORIDAD",
};

function NodeCard({ item, children }: { item: NodeItem; children?: ReactNode }) {
  return <article data-tone={item.tone}><header><strong>{item.label}</strong><em>{STATUS[item.tone]}</em></header><small>{item.value}</small>{children}</article>;
}

function scaled(values: number[], value: number, floor = 14) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 58;
  return floor + ((value - min) / (max - min)) * (100 - floor);
}

function Bars({ workspace, horizontal = false }: Props & { horizontal?: boolean }) {
  return <div className={horizontal ? styles.microBarsHorizontal : styles.microBars} aria-hidden="true">
    {workspace.chart.values.map((value, index) => <i key={`${workspace.chart.labels[index]}-${index}`} style={horizontal ? { width: `${scaled(workspace.chart.values, value)}%` } : { height: `${scaled(workspace.chart.values, value)}%` }} />)}
  </div>;
}

export function DomainWorkspaceVisual({ workspace }: Props) {
  const visualLabel = `${workspace.name}. ${workspace.chart.summary}`;
  switch (workspace.slug) {
    case "ai-software":
      return <div className={`${styles.industryVisual} ${styles.aiVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.axisLabels}><span>CAPACIDAD ↑</span><span>COSTO →</span></div>
        <div className={styles.capabilityPlot}>{workspace.nodes.map((item, index) => <div className={styles.plotPoint} key={item.label} data-tone={item.tone} style={{ left: `${13 + index * 17}%`, bottom: `${18 + ((index * 19) % 64)}%` }}><i /><b>{item.label}</b><small>{item.value}</small><em>{STATUS[item.tone]}</em></div>)}</div>
        <aside><span>CURVA DE ADOPCION</span><Bars workspace={workspace} /></aside>
      </div>;
    case "agriculture":
      return <div className={`${styles.industryVisual} ${styles.agricultureVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.fieldParcels}>{workspace.nodes.slice(0, 4).map((item, index) => <NodeCard key={item.label} item={item}><i style={{ width: `${46 + index * 13}%` }} /></NodeCard>)}</div>
        <aside><span>CAPAS</span><b>HUMEDAD</b><b>CLIMA 72H</b><b>SUELO</b><NodeCard item={workspace.nodes[4]} /></aside>
      </div>;
    case "biotechnology":
      return <div className={`${styles.industryVisual} ${styles.biotechVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.phaseRail}>{workspace.nodes.map((item, index) => <NodeCard key={item.label} item={item}><i style={{ width: `${workspace.chart.values[index]}%` }} /><b className={styles.phaseGate}>G{index + 1}</b></NodeCard>)}</div>
        <aside><span>PoS BAYESIANA</span><strong>{workspace.kpis[1].value}%</strong><small>prior y evidencia sinteticos</small></aside>
      </div>;
    case "blockchain":
      return <div className={`${styles.industryVisual} ${styles.blockchainVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.protocolCore}><span>CORE</span><strong>{workspace.kpis[0].value}M</strong></div>
        <div className={styles.protocolRing}>{workspace.nodes.map((item, index) => <div key={item.label} data-tone={item.tone} style={{ "--node": index } as CSSProperties}><i /><b>{item.label}</b><small>{item.value}</small><em>{STATUS[item.tone]}</em></div>)}</div>
        <aside><span>FLUJO DE CAPITAL</span><Bars workspace={workspace} horizontal /></aside>
      </div>;
    case "cities":
      return <div className={`${styles.industryVisual} ${styles.citiesVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.cityBlocks}>{Array.from({ length: 20 }, (_, index) => <i key={index} data-hot={index % 7 === 0 || index === 11} style={{ height: `${28 + ((index * 17) % 66)}%` }} />)}</div>
        <div className={styles.cityLayers}><span>CAPAS ACTIVAS</span><b>Movilidad</b><b>Vivienda</b><b>Servicios</b><b>Obras</b></div>
        <aside>{workspace.nodes.map((item) => <NodeCard key={item.label} item={item} />)}</aside>
      </div>;
    case "climate":
      return <div className={`${styles.industryVisual} ${styles.climateVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.exposureMap}>{workspace.nodes.map((item, index) => <NodeCard key={item.label} item={item}><i style={{ width: `${28 + index * 12}px`, height: `${28 + index * 12}px` }} /></NodeCard>)}</div>
        <aside><span>TRAYECTORIA CO2e</span><Bars workspace={workspace} /><small>observado sint. → objetivo</small></aside>
      </div>;
    case "corporate-strategy":
      return <div className={`${styles.industryVisual} ${styles.strategyVisual}`} role="group" aria-label={visualLabel}>
        <span className={styles.strategyY}>VALOR ↑</span><span className={styles.strategyX}>CAPACIDAD →</span>
        <div className={styles.strategyMatrix}>{workspace.nodes.map((item, index) => <div key={item.label} data-tone={item.tone} style={{ left: `${18 + ((index * 29) % 70)}%`, bottom: `${17 + ((index * 23) % 68)}%` }}><i style={{ width: `${30 + index * 5}px`, height: `${30 + index * 5}px` }} /><b>{item.label}</b><small>{item.value}</small><em>{STATUS[item.tone]}</em></div>)}</div>
        <aside><span>VALUE POOLS</span><Bars workspace={workspace} horizontal /></aside>
      </div>;
    case "culture-media":
      return <div className={`${styles.industryVisual} ${styles.cultureVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.narrativeCore}><span>NARRATIVA</span><strong>{workspace.kpis[2].value}</strong></div>
        <div className={styles.narrativeRings}>{workspace.nodes.map((item, index) => <NodeCard key={item.label} item={item}><i style={{ "--ring": index } as CSSProperties} /></NodeCard>)}</div>
        <aside><span>ALCANCE → AFINIDAD</span><Bars workspace={workspace} /></aside>
      </div>;
    case "cybersecurity":
      return <div className={`${styles.industryVisual} ${styles.cyberVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.attackPath}>{workspace.nodes.map((item, index) => <NodeCard key={item.label} item={item}><b>{index < workspace.nodes.length - 1 ? "→" : "GATE"}</b></NodeCard>)}</div>
        <aside><span>TIMELINE INCIDENTE</span>{["Detect", "Triage", "Contain", "Review"].map((label, index) => <p key={label}><i /><b>{label}</b><small>+{index * 19}m</small></p>)}</aside>
      </div>;
    case "defense":
      return <div className={`${styles.industryVisual} ${styles.defenseVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.syntheticMap}><span>SYNTHETIC MAP · NO COORDINATES</span><i className={styles.routeOne} /><i className={styles.routeTwo} />{workspace.nodes.slice(0, 3).map((item, index) => <div key={item.label} data-tone={item.tone} style={{ left: `${18 + index * 31}%`, top: `${22 + ((index * 27) % 55)}%` }}><b>{item.label}</b><small>{item.value}</small><em>{STATUS[item.tone]}</em></div>)}</div>
        <aside>{workspace.nodes.slice(3).map((item) => <NodeCard key={item.label} item={item} />)}<span>DECISION TRACE · 04</span></aside>
      </div>;
    case "education":
      return <div className={`${styles.industryVisual} ${styles.educationVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.cohortFunnel}>{workspace.chart.labels.map((label, index) => <div key={label} style={{ width: `${workspace.chart.values[index]}%` }}><span>{label}</span><b>{workspace.chart.values[index]}%</b></div>)}</div>
        <aside><span>SKILLS MATRIX</span>{workspace.nodes.slice(2).map((item) => <NodeCard key={item.label} item={item} />)}</aside>
      </div>;
    case "emergency-response":
      return <div className={`${styles.industryVisual} ${styles.emergencyVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.incidentMap}>{workspace.nodes.slice(0, 4).map((item, index) => <div key={item.label} data-tone={item.tone} style={{ left: `${12 + index * 22}%`, top: `${19 + ((index * 31) % 58)}%` }}><i /><b>{item.label}</b><small>{item.value}</small><em>{STATUS[item.tone]}</em></div>)}</div>
        <aside><span>CAPACIDAD</span><NodeCard item={workspace.nodes[4]} /><p><b>REFUGIOS</b><strong>{workspace.kpis[2].value}%</strong></p><p><b>RECURSOS</b><strong>{workspace.kpis[3].value}%</strong></p></aside>
      </div>;
    case "energy":
      return <div className={`${styles.industryVisual} ${styles.energyVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.energySources}>{workspace.nodes.slice(0, 3).map((item) => <NodeCard key={item.label} item={item} />)}</div>
        <div className={styles.energyStreams}><i /><i /><i /><strong>GRID</strong><b>{workspace.kpis[0].value} GW</b><i /><i /></div>
        <div className={styles.energyLoads}>{workspace.nodes.slice(3).map((item) => <NodeCard key={item.label} item={item} />)}</div>
        <aside><span>DEMANDA / OFERTA</span><Bars workspace={workspace} /></aside>
      </div>;
    case "finance":
      return <div className={`${styles.industryVisual} ${styles.financeVisual}`} role="group" aria-label={visualLabel}>
        <section><span>CURVA DE RENDIMIENTOS</span><div className={styles.yieldCurve}>{[3.8, 4.1, 4.25, 4.18, 4.04, 3.92].map((value, index) => <i key={index} style={{ bottom: `${18 + (value - 3.7) * 85}%`, left: `${6 + index * 18}%` }}><b>{value.toFixed(2)}</b></i>)}</div></section>
        <section><span>CORRELACION</span><div className={styles.correlationGrid}>{Array.from({ length: 16 }, (_, index) => <i key={index} style={{ opacity: .2 + ((index * 7) % 8) / 10 }}><b>{index % 5 === 0 ? "1.0" : ((index % 7) / 10).toFixed(1)}</b></i>)}</div></section>
        <section><span>DISTRIBUCION VaR · MONTE CARLO</span><div className={styles.varDistribution}>{[18, 31, 49, 73, 96, 79, 54, 36, 21].map((value, index) => <i key={index} style={{ height: `${value}%` }} data-tail={index < 2} />)}</div><small>cola 5% resaltada · sintetica</small></section>
      </div>;
    case "government":
      return <div className={`${styles.industryVisual} ${styles.governmentVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.budgetWaterfall}>{workspace.chart.labels.map((label, index) => <article key={label}><span>{label}</span><i style={{ height: `${workspace.chart.values[index]}%` }} /><b>{workspace.chart.values[index]}%</b></article>)}</div>
        <aside><span>PROGRAMAS / EXCEPCIONES</span>{workspace.nodes.map((item) => <NodeCard key={item.label} item={item} />)}</aside>
      </div>;
    case "healthcare":
      return <div className={`${styles.industryVisual} ${styles.healthcareVisual}`} role="group" aria-label={visualLabel}>
        <section><span>CAPACIDAD AGREGADA</span><div className={styles.bedGrid}>{Array.from({ length: 40 }, (_, index) => <i key={index} data-state={index < 34 ? "occupied" : index < 37 ? "turnover" : "available"} />)}</div><small>34 ocupadas · 3 rotacion · 3 disponibles</small></section>
        <aside><span>FLOW QUEUE</span>{workspace.nodes.map((item, index) => <NodeCard key={item.label} item={item}><b>{index * 11 + 8}m</b></NodeCard>)}</aside>
      </div>;
    case "infrastructure":
      return <div className={`${styles.industryVisual} ${styles.infrastructureVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.assetLanes}>{workspace.nodes.map((item, index) => <NodeCard key={item.label} item={item}><div><i style={{ width: `${workspace.chart.values[index] ?? 60}%` }} /></div><b>WO-{String(index + 14).padStart(3, "0")}</b></NodeCard>)}</div>
        <aside><span>LIFECYCLE</span><Bars workspace={workspace} horizontal /></aside>
      </div>;
    case "international-relations":
      return <div className={`${styles.industryVisual} ${styles.relationsVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.worldOrb}><i /><i /><i />{workspace.nodes.slice(0, 4).map((item, index) => <div key={item.label} data-tone={item.tone} style={{ left: `${13 + index * 23}%`, top: `${20 + ((index * 26) % 57)}%` }}><b>{item.label}</b><small>{item.value}</small><em>{STATUS[item.tone]}</em></div>)}</div>
        <aside><span>FLUJOS / DEPENDENCIAS</span><NodeCard item={workspace.nodes[4]} /><Bars workspace={workspace} horizontal /></aside>
      </div>;
    case "law":
      return <div className={`${styles.industryVisual} ${styles.lawVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.regulatoryTimeline}>{workspace.chart.labels.map((label, index) => <article key={label}><i /><span>{label}</span><b>{workspace.chart.values[index]}</b><small>{index < 3 ? "en curso" : "planificado"}</small></article>)}</div>
        <aside><span>OBLIGACIONES</span>{workspace.nodes.slice(0, 3).map((item) => <NodeCard key={item.label} item={item} />)}</aside>
      </div>;
    case "logistics":
      return <div className={`${styles.industryVisual} ${styles.logisticsVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.routeTower}><i className={styles.routePath} />{workspace.nodes.slice(0, 4).map((item, index) => <div key={item.label} data-tone={item.tone} style={{ left: `${9 + index * 25}%`, top: `${21 + ((index % 2) * 46)}%` }}><i /><b>{item.label}</b><small>{item.value}</small><em>{STATUS[item.tone]}</em></div>)}</div>
        <aside><span>MILESTONES</span>{["Pickup", "Port", "Customs", "DC", "Delivery"].map((label, index) => <p key={label}><i data-late={index === 2} /><b>{label}</b><small>{index === 2 ? "+6h" : "on plan"}</small></p>)}</aside>
      </div>;
    case "manufacturing":
      return <div className={`${styles.industryVisual} ${styles.manufacturingVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.factoryLines}>{workspace.nodes.slice(0, 4).map((item, index) => <NodeCard key={item.label} item={item}><div>{Array.from({ length: 5 }, (_, station) => <i key={station} data-stop={item.tone === "critical" && station === 3} />)}</div><b>SHIFT {index % 2 ? "B" : "A"}</b></NodeCard>)}</div>
        <aside><span>OEE</span>{["Disponibilidad", "Rendimiento", "Calidad"].map((label, index) => <p key={label}><b>{label}</b><i style={{ width: `${[82, 76, 88][index]}%` }} /><strong>{[82, 76, 88][index]}%</strong></p>)}</aside>
      </div>;
    case "mining":
      return <div className={`${styles.industryVisual} ${styles.miningVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.pitSection}><i /><i /><i /><span>PIT → CRUSH → PLANT</span>{workspace.nodes.slice(0, 3).map((item, index) => <NodeCard key={item.label} item={item}><b>CYCLE {11 + index * 4}m</b></NodeCard>)}</div>
        <aside><span>WATER / ASSETS</span>{workspace.nodes.slice(3).map((item) => <NodeCard key={item.label} item={item} />)}<Bars workspace={workspace} horizontal /></aside>
      </div>;
    case "public-safety":
      return <div className={`${styles.industryVisual} ${styles.safetyVisual}`} role="group" aria-label={visualLabel}>
        <section><span>INCIDENTES AGREGADOS · SIN PII</span><div className={styles.aggregateHeatmap}>{Array.from({ length: 36 }, (_, index) => <i key={index} style={{ opacity: .12 + ((index * 13) % 9) / 10 }} />)}</div></section>
        <aside><span>RESPONSE BANDS</span>{workspace.nodes.map((item, index) => <NodeCard key={item.label} item={item}><b>{6 + index * 1.4} min</b></NodeCard>)}</aside>
      </div>;
    case "science":
      return <div className={`${styles.industryVisual} ${styles.scienceVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.evidenceColumns}>{["HIPOTESIS", "EXPERIMENTO", "REPLICA"].map((label, column) => <section key={label}><span>{label}</span>{workspace.nodes.filter((_, index) => index % 3 === column || (column === 2 && index === 4)).map((item) => <NodeCard key={item.label} item={item} />)}</section>)}</div>
        <aside><span>FUERZA DE EVIDENCIA</span><Bars workspace={workspace} /></aside>
      </div>;
    case "space":
      return <div className={`${styles.industryVisual} ${styles.spaceVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.orbitMap}><i /><i /><i /><strong>EARTH</strong>{workspace.nodes.slice(0, 4).map((item, index) => <div key={item.label} data-tone={item.tone} style={{ "--orbit-node": index } as CSSProperties}><i /><b>{item.label}</b><small>{item.value}</small><em>{STATUS[item.tone]}</em></div>)}</div>
        <aside><span>CONJUNCTION QUEUE</span><NodeCard item={workspace.nodes[3]} /><NodeCard item={workspace.nodes[4]} /></aside>
      </div>;
    case "sports":
      return <div className={`${styles.industryVisual} ${styles.sportsVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.tacticalField}><i /><i />{Array.from({ length: 10 }, (_, index) => <b key={index} style={{ left: `${12 + (index % 4) * 24}%`, top: `${12 + Math.floor(index / 4) * 34 + (index % 2) * 7}%` }}>{index + 1}</b>)}</div>
        <aside><span>MICROCICLO / CARGA</span><Bars workspace={workspace} /><NodeCard item={workspace.nodes[0]} /><NodeCard item={workspace.nodes[1]} /></aside>
      </div>;
    case "telecommunications":
      return <div className={`${styles.industryVisual} ${styles.telecomVisual}`} role="group" aria-label={visualLabel}>
        <section><span>COBERTURA REGION → CELDA</span><div className={styles.coverageGrid}>{Array.from({ length: 42 }, (_, index) => <i key={index} data-level={(index * 7) % 5} />)}</div></section>
        <aside><span>EXCEPCIONES DE RED</span>{workspace.nodes.map((item) => <NodeCard key={item.label} item={item} />)}</aside>
      </div>;
    case "universities":
      return <div className={`${styles.industryVisual} ${styles.universityVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.researchClusters}>{workspace.nodes.map((item, index) => <div key={item.label} data-tone={item.tone} style={{ left: `${12 + ((index * 29) % 74)}%`, top: `${14 + ((index * 31) % 67)}%` }}><i style={{ width: `${34 + index * 7}px`, height: `${34 + index * 7}px` }} /><b>{item.label}</b><small>{item.value}</small><em>{STATUS[item.tone]}</em></div>)}</div>
        <aside><span>TRANSFER PIPELINE</span>{workspace.chart.labels.map((label, index) => <p key={label}><b>{label}</b><i style={{ width: `${workspace.chart.values[index]}%` }} /><small>{workspace.chart.values[index]}%</small></p>)}</aside>
      </div>;
    case "venture-capital":
      return <div className={`${styles.industryVisual} ${styles.ventureVisual}`} role="group" aria-label={visualLabel}>
        <section><span>DEAL FUNNEL</span>{workspace.chart.labels.map((label, index) => <div key={label} style={{ width: `${Math.max(28, workspace.chart.values[index])}%` }}><b>{label}</b><small>{workspace.chart.values[index]}%</small></div>)}</section>
        <section><span>RANKING / EVIDENCIA</span>{["Team", "Technology", "Market", "Competition", "MVP"].map((label, index) => <p key={label}><b>{index + 1}</b><span>{label}</span><i style={{ width: `${[82, 76, 69, 61, 54][index]}%` }} /><small>{[82, 76, 69, 61, 54][index]}</small></p>)}</section>
        <section><span>MONTE CARLO · NO PREDICTIVO</span><div className={styles.ventureDistribution}>{[12, 22, 39, 61, 84, 96, 73, 51, 33, 19].map((value, index) => <i key={index} style={{ height: `${value}%` }} />)}</div><small>P10 · P50 · P90 sinteticos</small></section>
      </div>;
    case "water":
      return <div className={`${styles.industryVisual} ${styles.waterVisual}`} role="group" aria-label={visualLabel}>
        <div className={styles.watershed}><i className={styles.riverMain} /><i className={styles.riverBranch} />{workspace.nodes.slice(0, 4).map((item, index) => <div key={item.label} data-tone={item.tone} style={{ left: `${12 + index * 23}%`, top: `${18 + ((index * 27) % 57)}%` }}><i /><b>{item.label}</b><small>{item.value}</small><em>{STATUS[item.tone]}</em></div>)}</div>
        <aside><span>RESERVA / DEMANDA</span><NodeCard item={workspace.nodes[4]} /><Bars workspace={workspace} horizontal /></aside>
      </div>;
    default:
      return <div className={`${styles.industryVisual} ${styles.fallbackVisual}`} role="group" aria-label={visualLabel}>{workspace.nodes.map((item) => <NodeCard key={item.label} item={item} />)}</div>;
  }
}

export { scaled as scaleDomainSeriesValue };

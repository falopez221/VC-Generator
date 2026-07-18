"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { simulateDomainScenario, type DomainKpiTone, type DomainWorkspaceDefinition } from "@/src/applications/domain-workspaces";
import { DomainWorkspaceVisual, scaleDomainSeriesValue } from "./DomainWorkspaceVisuals";
import styles from "./PrivateDomainWorkspaces.module.css";

type Props = { workspace: DomainWorkspaceDefinition };

const TONE_LABEL: Record<DomainKpiTone, string> = {
  positive: "favorable",
  neutral: "estable",
  watch: "observar",
  critical: "prioridad",
};

function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits }).format(value);
}

export function DomainWorkspaceDashboard({ workspace }: Props) {
  const [scenarioInput, setScenarioInput] = useState(workspace.scenario.baseline);
  const [notice, setNotice] = useState("Ajusta el supuesto para recalcular este escenario local.");
  const simulation = useMemo(() => simulateDomainScenario(workspace, scenarioInput), [scenarioInput, workspace]);
  const style = { "--workspace-accent": workspace.accent, "--workspace-accent-alt": workspace.accentAlt } as CSSProperties;

  const resetScenario = () => {
    setScenarioInput(workspace.scenario.baseline);
    setNotice("Escenario restablecido al supuesto base.");
  };

  return <article className={styles.workspacePage} style={style} data-workspace={workspace.visualMode}>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/app/applications">Mini-apps</Link><span>/</span><strong>{workspace.domain}</strong></nav>
    <header className={styles.workspaceHero}>
      <div><p>{workspace.name.toUpperCase()} · WORKSPACE AUTENTICADO</p><h1>{workspace.title}</h1><p>{workspace.summary}</p><ul>{workspace.vocabulary.map((term) => <li key={term}>{term}</li>)}</ul></div>
      <aside><span><i data-tone="positive" /> DEMO ACTIVA</span><strong>READ-ONLY</strong><small>Sintetico · reproducible · sin conexiones operacionales</small></aside>
    </header>

    <section className={styles.kpiStrip} aria-label="Indicadores clave">
      {workspace.kpis.map((item) => <article key={item.label} data-tone={item.tone}>
        <header><span>{item.label}</span><i title={TONE_LABEL[item.tone]} aria-label={TONE_LABEL[item.tone]} /></header>
        <strong>{formatNumber(item.value, item.decimals ?? 0)}<small>{item.unit}</small></strong>
        <p><b>{item.trend}</b>{item.context}</p>
      </article>)}
    </section>

    <section className={styles.commandGrid}>
      <section className={styles.primaryPanel} aria-labelledby="primary-visual-title">
        <header><div><span>{workspace.visualMode.replaceAll("-", " ").toUpperCase()}</span><h2 id="primary-visual-title">{workspace.chart.title}</h2></div><p><i /> observado sint.<i /> estimado<i /> alerta</p></header>
        <DomainWorkspaceVisual workspace={workspace} />
        <p className={styles.visualSummary}>{workspace.chart.summary}</p>
      </section>

      <aside className={styles.scenarioPanel} aria-labelledby="scenario-title">
        <header><span>SIMULACION PROPIA · DETERMINISTA</span><h2 id="scenario-title">{workspace.scenario.name}</h2><p>{workspace.scenario.assumption}</p></header>
        <label><span>{workspace.scenario.inputLabel}</span><output>{formatNumber(scenarioInput)} {workspace.scenario.inputUnit}</output>
          <input type="range" min={workspace.scenario.min} max={workspace.scenario.max} step={workspace.scenario.step} value={scenarioInput} onChange={(event) => { setScenarioInput(Number(event.target.value)); setNotice("Escenario recalculado con reglas publicas y acotadas."); }} />
          <small><b>{workspace.scenario.min}</b><b>base {workspace.scenario.baseline}</b><b>{workspace.scenario.max}</b></small>
        </label>
        <dl><div><dt>{workspace.scenario.primaryLabel}</dt><dd>{formatNumber(simulation.primary)} <small>{workspace.scenario.primaryUnit}</small></dd></div><div><dt>{workspace.scenario.secondaryLabel}</dt><dd>{formatNumber(simulation.secondary)} <small>{workspace.scenario.secondaryUnit}</small></dd></div></dl>
        <button type="button" onClick={resetScenario}>Restablecer supuesto</button>
        <p role="status" aria-live="polite">{notice}</p>
      </aside>
    </section>

    <section className={styles.analysisGrid}>
      <article className={styles.trendPanel}>
        <header><div><span>SERIE DEMOSTRATIVA</span><h2>{workspace.chart.title}</h2></div><strong>{workspace.chart.unit}</strong></header>
        <div className={styles.barChart} role="img" aria-label={`${workspace.chart.summary} Valores: ${workspace.chart.labels.map((label, index) => `${label} ${workspace.chart.values[index]}`).join(", ")}`}>
          {workspace.chart.values.map((value, index) => <div key={workspace.chart.labels[index]}><i style={{ height: `${scaleDomainSeriesValue(workspace.chart.values, value)}%` }} /><b>{value}</b><span>{workspace.chart.labels[index]}</span></div>)}
        </div>
        <p>{workspace.chart.summary}</p>
      </article>
      <article className={styles.riskPanel}>
        <header><span>EXCEPCIONES Y OPCIONES</span><h2>Donde requiere atencion humana</h2></header>
        <div><section><h3>RIESGOS</h3>{workspace.risks.map((risk, index) => <p key={risk}><b>R{index + 1}</b>{risk}</p>)}</section><section><h3>OPORTUNIDADES</h3>{workspace.opportunities.map((opportunity, index) => <p key={opportunity}><b>O{index + 1}</b>{opportunity}</p>)}</section></div>
      </article>
    </section>

    <section className={styles.methodGrid}>
      <article><header><span>MODELOS ESPECIFICOS</span><h2>Metodos y limites</h2></header>{workspace.models.map((item) => <section key={item.name}><strong>{item.name}</strong><p>{item.purpose}</p><small>Limite: {item.limitation}</small></section>)}</article>
      <article><header><span>FUENTES ESPECIFICAS</span><h2>Procedencia y frescura</h2></header>{workspace.sources.map((item) => <section key={item.name}><strong>{item.name}</strong><p>{item.kind} · {item.freshness}</p><small>{item.limitation}</small></section>)}</article>
      <article><header><span>ROLES ESPECIALIZADOS</span><h2>Equipo ilustrativo</h2></header>{workspace.roles.map((item) => <section key={item.name}><strong>{item.name}</strong><p>{item.focus}</p><small>Entrega: {item.output}</small></section>)}</article>
    </section>

    <footer className={styles.workspaceFooter}>
      <div><strong>HUMAN-IN-COMMAND</strong><p>{workspace.safetyNote ?? "Estimaciones, supuestos y simulaciones permanecen separados de evidencia observada. Ningun resultado autoriza capital, politica, operacion o despliegue."}</p></div>
      <nav><Link href="/app/applications">← Todos los dominios</Link><Link href="/app/missions/new">Usar como contexto de mision →</Link></nav>
    </footer>
  </article>;
}

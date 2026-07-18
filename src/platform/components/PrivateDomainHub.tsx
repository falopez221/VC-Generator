"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { DOMAIN_WORKSPACES, type DomainVisualGroup } from "@/src/applications/domain-workspaces";
import { DemoNotice } from "./DemoNotice";
import styles from "./PrivateDomainWorkspaces.module.css";

const GROUPS: { id: "all" | DomainVisualGroup; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "map", label: "Territorio" },
  { id: "network", label: "Redes" },
  { id: "pipeline", label: "Pipelines" },
  { id: "flow", label: "Flujos" },
  { id: "matrix", label: "Portafolios" },
];

export function PrivateDomainHub() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<(typeof GROUPS)[number]["id"]>("all");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const workspaces = useMemo(() => DOMAIN_WORKSPACES.filter((workspace) => {
    if (group !== "all" && workspace.visualGroup !== group) return false;
    if (!normalizedQuery) return true;
    return [workspace.domain, workspace.name, workspace.title, workspace.summary, ...workspace.vocabulary]
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  }), [group, normalizedQuery]);

  return <div className={styles.hub}>
    <DemoNotice />
    <header className={styles.hubHero}>
      <div>
        <p>30 MINI-APPS · AREA AUTENTICADA</p>
        <h1>Un workspace de decision propio para cada industria.</h1>
        <p>Cada dominio combina KPIs, vocabulario, fuentes, modelos, roles, visualizaciones y simulaciones especificas. Todo el contenido de esta demostracion es sintetico y reproducible.</p>
      </div>
      <dl aria-label="Resumen de workspaces">
        <div><dt>DOMINIOS</dt><dd>30</dd></div>
        <div><dt>SISTEMAS VISUALES</dt><dd>5</dd></div>
        <div><dt>DATOS</dt><dd>SINTETICOS</dd></div>
        <div><dt>AUTORIDAD</dt><dd>HUMANA</dd></div>
      </dl>
    </header>

    <section className={styles.hubControls} aria-label="Filtrar workspaces">
      <label>
        <span>BUSCAR INDUSTRIA, KPI O VOCABULARIO</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. riesgo climatico, OEE, liquidez..." />
      </label>
      <div role="group" aria-label="Familia visual">
        {GROUPS.map((item) => <button key={item.id} type="button" aria-pressed={group === item.id} onClick={() => setGroup(item.id)}>{item.label}</button>)}
      </div>
      <p role="status" aria-live="polite">{workspaces.length} workspaces disponibles</p>
    </section>

    <section className={styles.domainGrid} aria-label="Mini-apps por dominio">
      {workspaces.map((workspace, index) => {
        const style = { "--domain-accent": workspace.accent, "--domain-accent-alt": workspace.accentAlt } as CSSProperties;
        return <article key={workspace.slug} className={styles.domainCard} style={style} data-visual-group={workspace.visualGroup}>
          <header><span>{String(index + 1).padStart(2, "0")} · {workspace.visualMode.replaceAll("-", " ")}</span><i aria-hidden="true" /></header>
          <h2>{workspace.name}</h2>
          <p>{workspace.title}</p>
          <div className={styles.cardSignal} aria-hidden="true">
            {workspace.chart.values.slice(0, 6).map((value, signalIndex) => <i key={signalIndex} style={{ height: `${Math.max(18, Math.min(100, value))}%` }} />)}
          </div>
          <ul aria-label={`Vocabulario de ${workspace.domain}`}>{workspace.vocabulary.slice(0, 3).map((term) => <li key={term}>{term}</li>)}</ul>
          <footer><span>{workspace.kpis.length} KPI · {workspace.models.length} modelos · 1 simulacion</span><Link href={`/app/applications/${workspace.slug}`}>Abrir workspace <b aria-hidden="true">→</b></Link></footer>
        </article>;
      })}
      {!workspaces.length && <div className={styles.empty}><strong>No encontramos ese workspace.</strong><p>Proba otro termino o restablece la familia visual.</p><button type="button" onClick={() => { setQuery(""); setGroup("all"); }}>Mostrar todos</button></div>}
    </section>

    <aside className={styles.boundary}>
      <strong>BOUNDARY / PRIVATE PRODUCT</strong>
      <p>Estas mini-apps describen superficies de decision y roles ilustrativos. No incluyen prompts, perfiles privados, pesos propietarios, datos de clientes, credenciales ni la red completa de agentes. Ninguna accion ejecuta una decision real.</p>
      <Link href="/app/missions/new">Crear una mision gobernada →</Link>
    </aside>
  </div>;
}

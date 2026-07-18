"use client";

import { useEffect, useMemo, useState } from "react";
import {
  analyzeCompany,
  COMPANY_AGENT_WEIGHTS,
  screenNegativeBetas,
  type CompanyAnalysis,
  type CompanyAnalysisRequest,
} from "../company-intelligence.ts";
import { AGENT_NAMES } from "../types.ts";

const sampleStatement = `Revenue: 1280
EBITDA: 230
Free cash flow: 145
Cash: 320
Debt: 120
Shares outstanding: 100
Share price: 24.50
Beta: -0.18`;

const sampleCall = `Management raised guidance after strong demand in the core segment and reported margin expansion. The team also noted limited visibility, a volatile macro environment and possible customer delays. Retention improved, while management said pricing power must still be tested next quarter.`;

const initialRequest: CompanyAnalysisRequest = {
  companyName: "North Harbor Utilities (synthetic example)",
  ticker: "NTHR",
  financialStatement: sampleStatement,
  earningsCall: sampleCall,
  growthPct: 6,
  discountRatePct: 10,
  terminalGrowthPct: 2.5,
  ebitdaMultiple: 10,
};

const STORAGE_KEY = "vgs-company-intelligence-v1";

export function CompanyIntelligenceWorkbench() {
  const [request, setRequest] = useState(initialRequest);
  const [analysis, setAnalysis] = useState<CompanyAnalysis | null>(null);
  const [error, setError] = useState("");
  const [review, setReview] = useState("Request more evidence");
  const [saved, setSaved] = useState<CompanyAnalysis[]>([]);
  const negativeBetas = useMemo(() => screenNegativeBetas(), []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) queueMicrotask(() => setSaved((JSON.parse(raw) as CompanyAnalysis[]).slice(0, 5)));
    } catch { /* Local persistence is optional. */ }
  }, []);

  const update = <K extends keyof CompanyAnalysisRequest>(key: K, value: CompanyAnalysisRequest[K]) => setRequest((current) => ({ ...current, [key]: value }));

  const runAnalysis = () => {
    try {
      const next = analyzeCompany(request);
      setAnalysis(next);
      setError("");
    } catch (reason) {
      setAnalysis(null);
      setError(reason instanceof Error ? reason.message : "The supplied evidence could not be analyzed.");
    }
  };

  const saveAnalysis = () => {
    if (!analysis) return;
    const next = [analysis, ...saved.filter((item) => item.id !== analysis.id)].slice(0, 5);
    setSaved(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* The current result remains usable. */ }
  };

  const exportAnalysis = () => {
    if (!analysis) return;
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), humanReview: review, analysis }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${analysis.ticker.toLowerCase()}-company-analysis.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <main className="company-workbench" id="lab-content">
    <section className="company-hero" aria-labelledby="company-title">
      <div><p className="lab-kicker">PUBLIC COMPANY INTELLIGENCE · DETERMINISTIC DEMO</p><h1 id="company-title">Estados contables, earnings calls y <em>valor razonable</em> bajo una sola revisión humana.</h1><p>Cuatro agentes visibles contrastan los mismos datos. El sistema no compra, no vende y no sustituye la verificación de filings, transcripciones o precios.</p></div>
      <aside><strong>04</strong><span>agentes públicos</span><strong>02</strong><span>métodos de valuación</span><strong>01</strong><span>decisión humana</span></aside>
    </section>

    <section className="company-boundary" role="note"><strong>Límite de datos</strong><span>Este Lab no navega URLs ni descarga filings. Pegá cifras normalizadas en USD millones y un extracto de la earnings call. El ejemplo precargado y el screener son sintéticos.</span></section>

    <section className="company-input-grid" aria-labelledby="company-input-title">
      <div className="company-form-card">
        <header><p className="lab-kicker">01 · EVIDENCIA</p><h2 id="company-input-title">Cargar una empresa</h2></header>
        <div className="company-identity-row">
          <label><span>Empresa</span><input value={request.companyName} maxLength={80} onChange={(event) => update("companyName", event.target.value)} /></label>
          <label><span>Ticker</span><input value={request.ticker} maxLength={12} onChange={(event) => update("ticker", event.target.value)} /></label>
        </div>
        <label><span>Estado contable resumido</span><textarea rows={9} maxLength={8000} value={request.financialStatement} onChange={(event) => update("financialStatement", event.target.value)} aria-describedby="statement-format" /></label>
        <small id="statement-format">Campos requeridos: Revenue, EBITDA, Free cash flow, Cash, Debt, Shares outstanding, Share price y Beta. Importes en USD millones salvo precio y beta.</small>
        <label><span>Extracto de earnings call</span><textarea rows={8} maxLength={12000} value={request.earningsCall} onChange={(event) => update("earningsCall", event.target.value)} /></label>
      </div>
      <div className="company-form-card company-assumptions">
        <header><p className="lab-kicker">02 · SUPUESTOS</p><h2>Modelo editable</h2></header>
        <Range label="Crecimiento FCF inicial" value={request.growthPct} min={-30} max={50} step={0.5} suffix="%" onChange={(value) => update("growthPct", value)} />
        <Range label="Tasa de descuento" value={request.discountRatePct} min={5} max={40} step={0.5} suffix="%" onChange={(value) => update("discountRatePct", value)} />
        <Range label="Crecimiento terminal" value={request.terminalGrowthPct} min={-5} max={5} step={0.25} suffix="%" onChange={(value) => update("terminalGrowthPct", value)} />
        <Range label="Múltiplo EV / EBITDA" value={request.ebitdaMultiple} min={0} max={40} step={0.5} suffix="x" onChange={(value) => update("ebitdaMultiple", value)} />
        <button className="lab-button lab-button--primary company-run" type="button" onClick={runAnalysis}>Analizar empresa</button>
        <p className="company-model-note">DCF 70% + múltiplo 30%. Los límites evitan valores no finitos, pero no convierten un supuesto en evidencia.</p>
        {error && <p className="company-error" role="alert">{error}</p>}
      </div>
    </section>

    {analysis && <section className="company-results" aria-live="polite" aria-labelledby="company-result-title">
      <header className="company-result-header"><div><p className="lab-kicker">03 · CONCLUSIÓN COLECTIVA</p><h2 id="company-result-title">{analysis.companyName} <span>{analysis.ticker}</span></h2><p>{analysis.verdict}</p></div><div className={analysis.marginOfSafetyPct >= 0 ? "company-value is-positive" : "company-value is-negative"}><span>Valor razonable estimado</span><strong>${analysis.blendedFairValuePerShare.toFixed(2)}</strong><small>vs. precio provisto ${analysis.snapshot.currentPrice.toFixed(2)} · {analysis.marginOfSafetyPct.toFixed(1)}%</small></div></header>
      <div className="company-kpis">
        <Kpi label="DCF / acción" value={`$${analysis.dcfValuePerShare.toFixed(2)}`} detail="Estimación" />
        <Kpi label="Múltiplo / acción" value={`$${analysis.multipleValuePerShare.toFixed(2)}`} detail="Estimación" />
        <Kpi label="Calidad de evidencia" value={`${analysis.evidenceQuality}/100`} detail="Inferida del input" />
        <Kpi label="Incertidumbre" value={`${analysis.uncertainty}/100`} detail="Modelo público" />
        <Kpi label="Beta" value={analysis.snapshot.beta.toFixed(2)} detail={analysis.negativeBeta ? "Negativa · verificar" : "No negativa"} />
      </div>
      <div className="company-agent-grid">
        {AGENT_NAMES.map((name) => { const agent = analysis.agents[name]; return <article key={name}>
          <header><span>{name}</span><strong>{agent.score}/100</strong><small>Peso {agent.weightPct}% · Confianza {agent.confidence}%</small></header>
          <dl><div><dt>Observado</dt><dd>{agent.observedEvidence.length ? agent.observedEvidence.join(" ") : "No se detectó evidencia específica."}</dd></div><div><dt>Supuesto</dt><dd>{agent.assumptions.join(" ")}</dd></div><div><dt>Inferencia</dt><dd>{agent.inference}</dd></div><div><dt>Límite</dt><dd>{agent.limitation}</dd></div></dl>
        </article>; })}
      </div>
      <div className="company-audit-grid">
        <article><h3>Proyección FCF</h3><div className="company-fcf-bars" aria-label="Proyección de flujo de caja libre a cinco años">{analysis.projectedFcffM.map((value, index) => <div key={index}><i style={{ height: `${Math.max(4, Math.min(100, Math.abs(value) / Math.max(...analysis.projectedFcffM.map(Math.abs), 1) * 100))}%` }} className={value < 0 ? "is-negative" : undefined} /><span>A{index + 1}</span><small>${value.toFixed(1)}m</small></div>)}</div></article>
        <article><h3>Lectura de la call</h3><p>Tono determinista: <strong>{analysis.signals.toneScore.toFixed(1)}</strong></p><p>{analysis.signals.positiveSignals.length} señales positivas · {analysis.signals.negativeSignals.length} negativas · {analysis.signals.uncertaintySignals.length} de incertidumbre.</p><small>Coincidencia de frases; no comprende ironía, negación ni contexto completo.</small></article>
        <article><h3>Supuestos y alertas</h3><ul>{analysis.assumptions.map((item) => <li key={item}>{item}</li>)}{analysis.warnings.map((item) => <li key={item}>{item}</li>)}</ul></article>
      </div>
      <div className="company-human-gate"><label><span>Revisión humana</span><select value={review} onChange={(event) => setReview(event.target.value)}><option>Request more evidence</option><option>Add to watchlist</option><option>Do not prioritize</option><option>Uncertain</option></select></label><div><button type="button" className="lab-button" onClick={saveAnalysis}>Guardar localmente</button><button type="button" className="lab-button" onClick={exportAnalysis}>Exportar JSON</button></div><small>Estas acciones documentan una revisión; no ejecutan operaciones financieras.</small></div>
    </section>}

    <section className="company-beta-screen" aria-labelledby="beta-screen-title">
      <header><p className="lab-kicker">04 · BETA NEGATIVA</p><h2 id="beta-screen-title">Screener reproducible, no señal de compra.</h2><p>Resultados negativos dentro del universo sintético incluido. Para empresas reales, cargá una beta observada y verificá benchmark, frecuencia, ventana y estabilidad.</p></header>
      <div className="company-beta-table" tabIndex={0}><table><thead><tr><th>Empresa sintética</th><th>Sector</th><th>Beta</th><th>Clasificación</th><th>Evidencia</th></tr></thead><tbody>{negativeBetas.map((company) => <tr key={company.ticker}><th>{company.company}<small>{company.ticker}</small></th><td>{company.sector}</td><td>{company.beta.toFixed(2)}</td><td>Negativa · requiere validación</td><td>{company.evidence}</td></tr>)}</tbody></table></div>
    </section>

    {saved.length > 0 && <section className="company-saved" aria-labelledby="saved-title"><header><p className="lab-kicker">PERSISTENCIA LOCAL</p><h2 id="saved-title">Análisis guardados en este dispositivo</h2></header><div>{saved.map((item) => <button type="button" key={item.id} onClick={() => setAnalysis(item)}><strong>{item.ticker}</strong><span>${item.blendedFairValuePerShare.toFixed(2)} fair value</span><small>{item.verdict}</small></button>)}</div></section>}

    <section className="lab-warning"><strong>Limitación financiera</strong><p>Estimaciones demostrativas basadas en datos suministrados, supuestos editables y reglas públicas. No son asesoramiento financiero, recomendación de compra/venta ni garantía de valor o cobertura.</p></section>
  </main>;
}

function Range({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="company-range"><span>{label}<output>{value}{suffix}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function Kpi({ label, value, detail }: { label: string; value: string; detail: string }) { return <article><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }

export { COMPANY_AGENT_WEIGHTS };

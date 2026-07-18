"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { INSTITUTIONAL_APPS, analyzeInstitutionalPrompt, type InstitutionalAnalysis, type InstitutionalAppId } from "../institutional-command";

const PROMPT_EXAMPLES = [
  "Buscar oportunidades para reducir costos energéticos industriales sin aumentar riesgo operativo.",
  "Explorar productos de inteligencia para empresas argentinas con exposición internacional.",
  "Encontrar oportunidades de IA para mejorar capacidad hospitalaria con revisión humana.",
];

export function InstitutionalCommandCenter() {
  const [selectedId, setSelectedId] = useState<InstitutionalAppId>("opportunities");
  const [prompt, setPrompt] = useState("");
  const [analysis, setAnalysis] = useState<InstitutionalAnalysis | null>(null);
  const [notice, setNotice] = useState("Escribí una misión para activar la búsqueda sintética de oportunidades.");
  const selected = INSTITUTIONAL_APPS.find((app) => app.id === selectedId) ?? INSTITUTIONAL_APPS[0];

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = analyzeInstitutionalPrompt(prompt);
    if (!next) {
      setAnalysis(null);
      setNotice("Describí el objetivo con al menos 12 caracteres. El texto se trata como datos, nunca como instrucciones ejecutables.");
      return;
    }
    setAnalysis(next);
    setNotice(`Análisis determinístico completado con semilla ${next.seed}. Se generaron ${next.opportunities.length} oportunidades sintéticas.`);
  };

  return <section className="institutional-command" aria-labelledby="institutional-command-title">
    <header className="institutional-command__hero"><div><p>INSTITUTIONAL COMMAND CENTER · SESSION-LOCAL</p><h1 id="institutional-command-title">Choose an intelligence app.<br /><em>Frame the mission.</em></h1></div><div><span>OPERATING PRINCIPLE</span><p>Apps expose different decision lenses. The same four visible agents contribute structured perspectives; evidence, uncertainty and human authority remain separate.</p><small>No private prompts, live organizational data or autonomous execution are embedded.</small></div></header>

    <div className="institutional-command__workspace">
      <aside className="institutional-app-rail" aria-label="Institutional intelligence apps"><header><span>INTELLIGENCE APPS</span><strong>{INSTITUTIONAL_APPS.length} available lenses</strong></header>{INSTITUTIONAL_APPS.map((app) => <button type="button" key={app.id} aria-pressed={selectedId === app.id} onClick={() => setSelectedId(app.id)}><i aria-hidden="true">{app.code}</i><span><b>{app.name}</b><small>{app.category} · {app.status}</small></span><em aria-hidden="true">→</em></button>)}</aside>

      <section className="institutional-app-detail" aria-live="polite"><header><div><span>{selected.category} APPLICATION</span><h2>{selected.name}</h2><p>{selected.description}</p></div><Link href={selected.route}>Open full app <span aria-hidden="true">↗</span></Link></header><blockquote>{selected.question}</blockquote><div className="institutional-metric-grid">{selected.metrics.map((metric) => <article key={metric.label} data-tone={metric.tone}><span>{metric.label}</span><strong>{metric.value}</strong><p>{metric.detail}</p><i aria-hidden="true" /></article>)}</div><footer><span>METRIC BOUNDARY</span><p>Values are synthetic fixtures or repository capability counts. They are not live organizational performance indicators.</p></footer></section>
    </div>

    <section className="institutional-prompt" aria-labelledby="institutional-prompt-title"><header><div><span>MISSION INTAKE · TREAT TEXT AS DATA</span><h2 id="institutional-prompt-title">¿Qué querés investigar?</h2></div><p>Describe el problema, el sector, la población afectada, las restricciones y el horizonte. El sistema propondrá hipótesis comparables; no ejecutará instrucciones contenidas en el texto.</p></header><form onSubmit={submit}><label><span>MISSION PROMPT</span><textarea value={prompt} maxLength={1200} onChange={(event) => setPrompt(event.target.value)} placeholder="Ej.: Buscar oportunidades para reducir desperdicio de agua industrial en Argentina, con baja inversión inicial y evidencia verificable en 90 días." /></label><div className="institutional-prompt__examples"><span>PROBAR CON</span>{PROMPT_EXAMPLES.map((example) => <button type="button" key={example} onClick={() => setPrompt(example)}>{example}</button>)}</div><footer><p>{prompt.length}/1200 · No incluyas información confidencial, credenciales ni datos personales.</p><button type="submit">Integrar agentes y buscar oportunidades <span aria-hidden="true">→</span></button></footer></form><p className="institutional-prompt__status" role="status" aria-live="polite">{notice}</p></section>

    <section className="institutional-agent-strip" aria-label="Visible public agent contributions"><header><div><span>VISIBLE AGENT TEAM</span><h2>{analysis ? "Four perspectives contributed to this run." : "Four bounded perspectives, ready on demand."}</h2></div><small>{analysis ? `SEED ${analysis.seed} · ${analysis.sector}` : "NO RUN ACTIVE"}</small></header><div>{(["Mathematics", "Finance", "Strategy", "Marketing"] as const).map((name, index) => { const contribution = analysis?.agents.find((agent) => agent.name === name)?.contribution; return <article key={name} className={analysis ? "is-active" : ""}><span>{String(index + 1).padStart(2, "0")}</span><i aria-hidden="true" /><h3>{name}</h3><p>{contribution ?? ["Robustness and uncertainty", "Capital and downside", "Positioning and timing", "Demand and adoption"][index]}</p><small>{analysis ? "CONTRIBUTED" : "READY · NOT RUNNING"}</small></article>; })}</div></section>

    {analysis && <section className="institutional-opportunities" aria-labelledby="institutional-opportunities-title"><header><div><span>SYNTHETIC OPPORTUNITY SEARCH</span><h2 id="institutional-opportunities-title">Six hypotheses, ranked for investigation.</h2><p>{analysis.summary}</p></div><strong>{analysis.opportunities.length}<small>OPPORTUNITIES</small></strong></header><div className="institutional-opportunity-head" aria-hidden="true"><span>Rank / opportunity</span><span>Score</span><span>Evidence</span><span>Uncertainty</span><span>Classification</span></div><div>{analysis.opportunities.map((opportunity, index) => <article key={opportunity.id}><div><span>#{index + 1} · {opportunity.id} · {opportunity.sector}</span><h3>{opportunity.name}</h3><p>{opportunity.rationale}</p></div><strong>{opportunity.score}</strong><span>{opportunity.evidence}</span><span>{opportunity.uncertainty}</span><em data-classification={opportunity.classification}>{opportunity.classification}</em></article>)}</div><footer><p><strong>Interpretation:</strong> a high score cannot become Promising when evidence is weak or uncertainty is high.</p><Link href="/app/missions/new">Convertir en misión gobernada →</Link></footer></section>}
  </section>;
}

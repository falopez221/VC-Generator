import type { BayesianResult, MonteCarloResult, Opportunity, ScenarioResult } from "../types.ts";

export function HistogramChart({ result }: { result: MonteCarloResult }) {
  const maximum = Math.max(...result.histogram, 1);
  return (
    <div className="lab-histogram" role="img" aria-label={`Monte Carlo distribution. Mean ${result.mean}, P10 ${result.p10}, P90 ${result.p90}, probability above threshold ${result.probabilityAboveThreshold} percent.`}>
      <div className="lab-bars">{result.histogram.map((value, index) => <i key={index} style={{ height: `${Math.max(3, value / maximum * 100)}%` }}><span className="sr-only">Bin {index + 1}: {value} simulations</span></i>)}</div>
      <div className="lab-axis"><span>downside</span><span>distribution of simulated return</span><span>upside</span></div>
    </div>
  );
}

export function RadarChart({ opportunity }: { opportunity: Opportunity }) {
  const values = [opportunity.dimensions.marketPotential, opportunity.dimensions.financialViability, opportunity.dimensions.strategicAdvantage, opportunity.dimensions.adoptionPotential, opportunity.dimensions.technicalFeasibility, opportunity.dimensions.evidenceQuality];
  const labels = ["Market", "Finance", "Strategy", "Adoption", "Technical", "Evidence"];
  const points = values.map((value, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / values.length;
    const radius = value / 100 * 72;
    return `${100 + Math.cos(angle) * radius},${100 + Math.sin(angle) * radius}`;
  }).join(" ");
  return (
    <svg className="lab-radar" viewBox="0 0 200 200" role="img" aria-label={`${opportunity.name} public dimension radar: ${labels.map((label, index) => `${label} ${Math.round(values[index])}`).join(", ")}.`}>
      <title>Public dimension radar for {opportunity.name}</title>
      {[24, 48, 72].map((radius) => <circle key={radius} cx="100" cy="100" r={radius} />)}
      {values.map((_, index) => { const angle = -Math.PI / 2 + index * Math.PI * 2 / values.length; return <line key={labels[index]} x1="100" y1="100" x2={100 + Math.cos(angle) * 78} y2={100 + Math.sin(angle) * 78} />; })}
      <polygon points={points} />
      {values.map((value, index) => { const angle = -Math.PI / 2 + index * Math.PI * 2 / values.length; return <circle className="lab-radar-point" key={labels[index]} cx={100 + Math.cos(angle) * value / 100 * 72} cy={100 + Math.sin(angle) * value / 100 * 72} r="3"><title>{labels[index]}: {Math.round(value)}</title></circle>; })}
    </svg>
  );
}

export function ScenarioChart({ scenarios }: { scenarios: ScenarioResult[] }) {
  return <div className="lab-scenario-chart" role="img" aria-label={scenarios.map((scenario) => `${scenario.name} score ${scenario.score}`).join(", ")}>{scenarios.map((scenario) => <div key={scenario.name}><span>{scenario.name}</span><i><b style={{ width: `${scenario.score}%` }} /></i><strong>{scenario.score.toFixed(1)}</strong><small>Risk {scenario.risk.toFixed(0)} · Confidence {scenario.confidence.toFixed(0)}</small></div>)}</div>;
}

export function BayesianChart({ result }: { result: BayesianResult }) {
  return <div className="lab-bayes-chart" role="img" aria-label={`Prior ${result.prior} percent, posterior ${result.posterior} percent, change ${result.delta} points.`}><div><span>Prior</span><i><b style={{ width: `${result.prior}%` }} /></i><strong>{result.prior}%</strong></div><div><span>Posterior</span><i><b style={{ width: `${result.posterior}%` }} /></i><strong>{result.posterior}%</strong></div></div>;
}

export function RiskMatrixChart({ opportunity }: { opportunity: Opportunity }) {
  return (
    <div className="lab-risk-matrix" role="img" aria-label={`${opportunity.name} risk matrix. ${opportunity.risks.map((risk) => `${risk.name}: probability ${risk.probability}, impact ${risk.impact}`).join(". ")}`}>
      <span className="risk-y">Impact ↑</span><span className="risk-x">Probability →</span>
      {opportunity.risks.map((risk, index) => <i key={risk.name} style={{ left: `${risk.probability}%`, bottom: `${risk.impact}%` }}><b>{index + 1}</b><span>{risk.name}</span></i>)}
    </div>
  );
}

export function ParetoChart({ points, opportunities }: { points: { id: string; x: number; y: number; dominated: boolean }[]; opportunities: Opportunity[] }) {
  const yValues = points.map((point) => point.y);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const scaleY = (value: number) => maxY === minY ? 50 : 88 - (value - minY) / (maxY - minY) * 76;
  return (
    <svg className="lab-pareto" viewBox="0 0 600 260" role="img" aria-label={`${points.filter((point) => !point.dominated).length} non-dominated opportunities in the selected public Pareto comparison.`}>
      <title>Public Pareto comparison</title><line x1="52" y1="220" x2="574" y2="220" /><line x1="52" y1="20" x2="52" y2="220" />
      {points.map((point) => { const opportunity = opportunities.find((candidate) => candidate.id === point.id); return <g key={point.id} className={point.dominated ? "is-dominated" : "is-frontier"}><circle cx={52 + point.x / 100 * 510} cy={scaleY(point.y) / 100 * 230} r={point.dominated ? 6 : 9}><title>{opportunity?.name}: x {point.x}, y {point.y}</title></circle><text x={58 + point.x / 100 * 510} y={scaleY(point.y) / 100 * 230 - 8}>{point.id}</text></g>; })}
      <text x="280" y="252">stronger x objective →</text><text x="6" y="18">y trade-off</text>
    </svg>
  );
}


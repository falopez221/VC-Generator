import type { BayesianResult, LeastSquaresResult, MonteCarloResult, Opportunity, ScenarioResult } from "../types.ts";

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
  return <div className="lab-scenario-chart" role="img" aria-label={scenarios.map((scenario) => `${scenario.name} score ${scenario.score}, return index ${scenario.returnIndex}`).join(", ")}>{scenarios.map((scenario) => <div key={scenario.name}><span>{scenario.name}</span><i><b style={{ width: `${scenario.score}%` }} /></i><strong>{scenario.score.toFixed(1)}</strong><small>Risk {scenario.risk.toFixed(0)} · Confidence {scenario.confidence.toFixed(0)} · Return index {scenario.returnIndex.toFixed(0)}</small></div>)}</div>;
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

export function ParetoChart({ points, opportunities, xLabel, yLabel }: { points: { id: string; x: number; y: number; dominated: boolean }[]; opportunities: Opportunity[]; xLabel: string; yLabel: string }) {
  const left = 68;
  const right = 570;
  const top = 28;
  const bottom = 242;
  const yValues = points.map((point) => point.y);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const scaleX = (value: number) => left + value / 100 * (right - left);
  const scaleY = (value: number) => maxY === minY ? (top + bottom) / 2 : bottom - (value - minY) / (maxY - minY) * (bottom - top);
  return (
    <svg className="lab-pareto" viewBox="0 0 600 292" role="img" aria-label={`${points.filter((point) => !point.dominated).length} non-dominated opportunities. Each point includes straight projection guides to the ${xLabel} and ${yLabel} axes.`}>
      <title>Public Pareto comparison with axis projection guides</title>
      {[0, 25, 50, 75, 100].map((tick) => <g className="lab-pareto-grid" key={`x-${tick}`}><line x1={scaleX(tick)} y1={top} x2={scaleX(tick)} y2={bottom} /><text x={scaleX(tick)} y={bottom + 15} textAnchor="middle">{tick}</text></g>)}
      {[0, .25, .5, .75, 1].map((ratio) => { const value = minY + (maxY - minY) * ratio; const y = scaleY(value); return <g className="lab-pareto-grid" key={`y-${ratio}`}><line x1={left} y1={y} x2={right} y2={y} /><text x={left - 8} y={y + 3} textAnchor="end">{Math.round(value)}</text></g>; })}
      <line className="lab-pareto-axis" x1={left} y1={bottom} x2={right} y2={bottom} /><line className="lab-pareto-axis" x1={left} y1={top} x2={left} y2={bottom} />
      {points.map((point) => {
        const opportunity = opportunities.find((candidate) => candidate.id === point.id);
        const x = scaleX(point.x);
        const y = scaleY(point.y);
        return <g key={point.id} className={point.dominated ? "is-dominated" : "is-frontier"}><line className="lab-pareto-guide" x1={x} y1={y} x2={x} y2={bottom} /><line className="lab-pareto-guide" x1={left} y1={y} x2={x} y2={y} /><circle cx={x} cy={y} r={point.dominated ? 3.5 : 4.5}><title>{opportunity?.name}: {xLabel} {point.x}, {yLabel} {point.y}</title></circle><text x={x + 6} y={y - 5}>{point.id}</text></g>;
      })}
      <text className="lab-pareto-axis-label" x={(left + right) / 2} y="283" textAnchor="middle">{xLabel} (higher is stronger)</text><text className="lab-pareto-axis-label" x="8" y="16">{yLabel}</text>
    </svg>
  );
}

export function LeastSquaresChart({ result, xLabel, yLabel }: { result: LeastSquaresResult; xLabel: string; yLabel: string }) {
  if (!result.informative || result.points.length < 2) {
    return <div className="lab-empty-chart" role="status"><strong>Descriptive fit unavailable</strong><p>{result.reason}</p></div>;
  }
  const left = 68;
  const right = 570;
  const top = 28;
  const bottom = 225;
  const values = result.points.flatMap((point) => [point.y, point.fittedY]);
  const minY = Math.min(...values);
  const maxY = Math.max(...values);
  const scaleX = (value: number) => left + value / 100 * (right - left);
  const scaleY = (value: number) => maxY === minY ? (top + bottom) / 2 : bottom - (value - minY) / (maxY - minY) * (bottom - top);
  const minX = Math.min(...result.points.map((point) => point.x));
  const maxX = Math.max(...result.points.map((point) => point.x));
  const startY = result.intercept + result.slope * minX;
  const endY = result.intercept + result.slope * maxX;
  return <svg className="lab-least-squares" viewBox="0 0 600 278" role="img" aria-label={`Least-squares descriptive trend between ${xLabel} and ${yLabel}. R squared ${result.rSquared}.`}>
    <title>Least-squares descriptive trend</title>
    {[0, 25, 50, 75, 100].map((tick) => <line className="lab-trend-grid" key={tick} x1={scaleX(tick)} y1={top} x2={scaleX(tick)} y2={bottom} />)}
    <line className="lab-trend-axis" x1={left} y1={bottom} x2={right} y2={bottom} /><line className="lab-trend-axis" x1={left} y1={top} x2={left} y2={bottom} />
    <line className="lab-trend-line" x1={scaleX(minX)} y1={scaleY(startY)} x2={scaleX(maxX)} y2={scaleY(endY)} />
    {result.points.map((point) => <g key={point.id}><line className="lab-trend-residual" x1={scaleX(point.x)} y1={scaleY(point.y)} x2={scaleX(point.x)} y2={scaleY(point.fittedY)} /><circle cx={scaleX(point.x)} cy={scaleY(point.y)} r="4"><title>{point.id}: observed {point.y}; fitted {point.fittedY}</title></circle><text x={scaleX(point.x) + 6} y={scaleY(point.y) - 5}>{point.id}</text></g>)}
    <text className="lab-pareto-axis-label" x={(left + right) / 2} y="268" textAnchor="middle">{xLabel}</text><text className="lab-pareto-axis-label" x="8" y="16">{yLabel}</text>
  </svg>;
}

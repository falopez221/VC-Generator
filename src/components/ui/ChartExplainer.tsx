type ChartExplainerProps = {
  shows: string;
  matters: string;
  interpret: string;
};

export function ChartExplainer({ shows, matters, interpret }: ChartExplainerProps) {
  return (
    <div className="chart-explainer">
      <p><span>WHAT DOES THIS SHOW?</span>{shows}</p>
      <p><span>WHY DOES IT MATTER?</span>{matters}</p>
      <p><span>HOW SHOULD I INTERPRET IT?</span>{interpret}</p>
    </div>
  );
}

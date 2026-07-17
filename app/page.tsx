import { Header } from "@/src/components/layout/Header";
import { Footer } from "@/src/components/layout/Footer";
import { Hero } from "@/src/components/sections/Hero";
import { ProblemSolution } from "@/src/components/sections/ProblemSolution";
import { Architecture } from "@/src/components/sections/Architecture";
import { AgentExplorer } from "@/src/components/sections/AgentExplorer";
import { DecisionPipeline } from "@/src/components/sections/DecisionPipeline";
import { StrategyLab } from "@/src/components/sections/StrategyLab";
import { ModelingEvaluation } from "@/src/components/sections/ModelingEvaluation";
import { UseCasesBusiness } from "@/src/components/sections/UseCasesBusiness";
import { RoadmapRisks } from "@/src/components/sections/RoadmapRisks";
import { FinalCta } from "@/src/components/sections/FinalCta";
import { WhitepaperInsights } from "@/src/components/sections/WhitepaperInsights";
import { WhitepaperSection } from "@/src/components/sections/WhitepaperSection";
import { ExecutiveSummary } from "@/src/components/sections/ExecutiveSummary";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <Header />
      <main id="contenido">
        <Hero />
        <ExecutiveSummary />
        <ProblemSolution />
        <WhitepaperInsights />
        <Architecture />
        <AgentExplorer />
        <DecisionPipeline />
        <StrategyLab />
        <ModelingEvaluation />
        <UseCasesBusiness />
        <RoadmapRisks />
        <WhitepaperSection />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}

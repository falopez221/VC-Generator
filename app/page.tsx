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
import { EvidenceContext } from "@/src/components/sections/EvidenceContext";
import { ExecutiveSummary } from "@/src/components/sections/ExecutiveSummary";
import { PlatformShowcase } from "@/src/components/sections/PlatformShowcase";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <Header />
      <main id="contenido">
        <Hero />
        <PlatformShowcase />
        <ExecutiveSummary />
        <ProblemSolution />
        <EvidenceContext />
        <Architecture />
        <AgentExplorer />
        <DecisionPipeline />
        <StrategyLab />
        <ModelingEvaluation />
        <UseCasesBusiness />
        <RoadmapRisks />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
